"use client"

import { useState, useEffect, useRef } from 'react'
import { X, Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react'
import { useChat } from '@/lib/context/ChatSocketContext'
import { getUserId } from '@/lib/utils/Jwt'

interface VideoCallModalProps {
  open: boolean
  onClose: () => void
  conversationId: string
  recipientId?: string
  recipientName?: string
  callType: 'video' | 'voice'
  isIncoming?: boolean
  callerId?: string
  callerName?: string
}

// STUN servers for WebRTC
const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

export function VideoCallModal({
  open,
  onClose,
  conversationId,
  recipientId,
  recipientName,
  callType,
  isIncoming = false,
  callerId,
  callerName
}: VideoCallModalProps) {
  const { socket, isConnected } = useChat()
  const userId = getUserId()
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video')
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'connecting'
  )
  const [error, setError] = useState<string | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  // Initialize peer connection
  useEffect(() => {
    if (!open || !socket || !isConnected) return

    const pc = new RTCPeerConnection(STUN_SERVERS)
    peerConnectionRef.current = pc

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          conversationId,
          userId,
          candidate: event.candidate
        })
      }
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0])
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        setCallStatus('connected')
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall()
      }
    }

    return () => {
      if (pc) {
        pc.close()
      }
    }
  }, [open, socket, isConnected, conversationId, userId])

  // Setup socket listeners
  useEffect(() => {
    if (!socket || !open) return

    const handleCallOffer = async (data: {
      conversationId: string
      callerId: string
      offer: RTCSessionDescriptionInit
      type: 'video' | 'voice'
    }) => {
      if (data.conversationId !== conversationId) return
      
      try {
        const pc = peerConnectionRef.current
        if (!pc) return

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        
        // Get local stream if not already got
        if (!localStreamRef.current) {
          await getLocalStream(data.type)
        }

        // Don't automatically create answer - wait for user to click answer button
        // The answer will be created when user clicks the answer button
      } catch (err) {
        console.error('Error handling call offer:', err)
        setError('Failed to answer call')
      }
    }

    const handleCallAnswer = async (data: {
      conversationId: string
      calleeId: string
      answer: RTCSessionDescriptionInit
    }) => {
      if (data.conversationId !== conversationId) return

      try {
        const pc = peerConnectionRef.current
        if (!pc) return

        await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        setCallStatus('connected')
      } catch (err) {
        console.error('Error handling call answer:', err)
        setError('Failed to establish connection')
      }
    }

    const handleIceCandidate = async (data: {
      conversationId: string
      userId: string
      candidate: RTCIceCandidateInit
    }) => {
      if (data.conversationId !== conversationId || data.userId === userId) return

      try {
        const pc = peerConnectionRef.current
        if (!pc) return

        await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (err) {
        console.error('Error adding ICE candidate:', err)
      }
    }

    const handleCallEnd = (data: { conversationId: string; endedBy: string }) => {
      if (data.conversationId !== conversationId) return
      handleEndCall()
    }

    const handleCallReject = (data: { conversationId: string; rejectedBy: string }) => {
      if (data.conversationId !== conversationId) return
      setError('Call was rejected')
      handleEndCall()
    }

    socket.on('call-offer', handleCallOffer)
    socket.on('call-answer', handleCallAnswer)
    socket.on('ice-candidate', handleIceCandidate)
    socket.on('call-end', handleCallEnd)
    socket.on('call-reject', handleCallReject)

    return () => {
      socket.off('call-offer', handleCallOffer)
      socket.off('call-answer', handleCallAnswer)
      socket.off('ice-candidate', handleIceCandidate)
      socket.off('call-end', handleCallEnd)
      socket.off('call-reject', handleCallReject)
    }
  }, [socket, open, conversationId, userId])

  // Get local media stream
  const getLocalStream = async (type: 'video' | 'voice') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { facingMode: 'user' } : false,
        audio: true
      })
      
      localStreamRef.current = stream
      setLocalStream(stream)
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Add tracks to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current?.addTrack(track, stream)
        })
      }
    } catch (err) {
      console.error('Error getting local stream:', err)
      setError('Failed to access camera/microphone')
    }
  }

  // Start call (outgoing)
  useEffect(() => {
    if (!open || isIncoming || !socket || !isConnected || !peerConnectionRef.current) return

    const startCall = async () => {
      try {
        await getLocalStream(callType)

        const pc = peerConnectionRef.current!
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        socket.emit('call-offer', {
          conversationId,
          callerId: userId,
          calleeId: recipientId,
          offer: pc.localDescription,
          type: callType
        })

        setCallStatus('ringing')
      } catch (err) {
        console.error('Error starting call:', err)
        setError('Failed to start call')
      }
    }

    startCall()
  }, [open, isIncoming, socket, isConnected, conversationId, userId, recipientId, callType])

  // Update local video/audio tracks
  useEffect(() => {
    if (!localStreamRef.current) return

    localStreamRef.current.getVideoTracks().forEach(track => {
      track.enabled = isVideoEnabled && callType === 'video'
    })

    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = isAudioEnabled
    })
  }, [isVideoEnabled, isAudioEnabled, callType])

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      handleEndCall()
    }
  }, [open])

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setRemoteStream(null)
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    setCallStatus('ended')
    
    if (socket && conversationId && userId) {
      socket.emit('call-end', {
        conversationId,
        userId
      })
    }

    onClose()
  }

  const handleRejectCall = () => {
    if (socket && conversationId && userId) {
      socket.emit('call-reject', {
        conversationId,
        userId
      })
    }
    handleEndCall()
  }

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
  }

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Remote video */}
        <div className="flex-1 relative">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-center text-white">
                <div className="text-4xl font-semibold mb-2">
                  {isIncoming ? callerName : recipientName}
                </div>
                <div className="text-lg text-gray-400">
                  {callStatus === 'ringing' ? 'Ringing...' : 
                   callStatus === 'connecting' ? 'Connecting...' : 
                   callStatus === 'connected' ? 'Connected' : 'Call ended'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Local video (picture-in-picture) */}
        {callType === 'video' && localStream && (
          <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
          {/* Toggle Video (only for video calls) */}
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full ${
                isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
              } text-white transition-colors`}
              title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
          )}

          {/* Toggle Audio */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* End/Reject Call */}
          {isIncoming && callStatus === 'ringing' ? (
            <button
              onClick={handleRejectCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Reject call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="End call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          )}

          {/* Answer Call (for incoming) */}
          {isIncoming && callStatus === 'ringing' && (
            <button
              onClick={async () => {
                if (!peerConnectionRef.current || !socket) return
                
                try {
                  setCallStatus('connecting')
                  
                  // Get local stream
                  if (!localStreamRef.current) {
                    await getLocalStream(callType)
                  }

                  // Create answer
                  const pc = peerConnectionRef.current
                  if (pc.localDescription) {
                    // Already have local description, just send answer
                    socket.emit('call-answer', {
                      conversationId,
                      calleeId: userId,
                      answer: pc.localDescription
                    })
                  } else {
                    // Create answer
                    const answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)
                    
                    socket.emit('call-answer', {
                      conversationId,
                      calleeId: userId,
                      answer: pc.localDescription
                    })
                  }
                } catch (err) {
                  console.error('Error answering call:', err)
                  setError('Failed to answer call')
                }
              }}
              className="p-4 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors"
              title="Answer call"
            >
              <Phone className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleEndCall}
          className="absolute top-4 left-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

