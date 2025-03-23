import { useState, useEffect, useRef, useCallback } from 'react';

interface ProgressEvent {
  type: 'progress' | 'telegramUploadProgress' | 'downloadProgress';
  progress: number;
  jobId?: number;
  requestId?: string;
}

interface WebSocketMessage {
  type: string;
  progress?: number;
  jobId?: number;
  requestId?: string;
  message?: string;
  reconnectToken?: string;
}

export function useWebSocketProgress() {
  const [isConnected, setIsConnected] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTokenRef = useRef<string | null>(null);
  // A ref to track if we're in a successful connection state
  const isReconnectedRef = useRef(false);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY_MS = 2000;
  const PING_INTERVAL_MS = 15000; // Send ping every 15 seconds
  
  // Try to get stored token from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('ws_reconnect_token');
      if (storedToken) {
        reconnectTokenRef.current = storedToken;
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }, []);

  // Create a WebSocket connection
  const connectWebSocket = useCallback((useReconnectToken = true) => {
    // Reset reconnected status when starting a new connection
    isReconnectedRef.current = false;
    
    // Clear any existing reconnect timeout and ping interval
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Determine WebSocket URL dynamically
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws`;

    // Close existing socket if it exists
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Create WebSocket connection
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    // Setup event handlers
    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      
      // If we have a reconnect token, try to use it
      if (useReconnectToken && reconnectTokenRef.current) {
        socket.send(JSON.stringify({
          type: 'reconnect',
          token: reconnectTokenRef.current
        }));
      }
      
      // Reset reconnect attempts on successful connection
      reconnectAttemptsRef.current = 0;
      
      // Setup ping interval to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          } catch (error) {
            console.error('Error sending ping:', error);
          }
        }
      }, PING_INTERVAL_MS);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        
        // Store the reconnect token if provided
        if (data.type === 'connected' && data.reconnectToken) {
          reconnectTokenRef.current = data.reconnectToken;
          try {
            localStorage.setItem('ws_reconnect_token', data.reconnectToken);
          } catch (error) {
            console.error('Error storing reconnect token:', error);
          }
        }
        
        // Only process non-pong messages with our handler
        if (data.type !== 'pong') {
          handleWebSocketMessage(data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    socket.addEventListener('close', (event) => {
      console.log(`WebSocket connection closed (${event.code}: ${event.reason})`);
      setIsConnected(false);
      
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // If we get a normal closure (code 1000) or a specific code from the server,
      // keep the reconnected status, otherwise reset it
      if (event.code !== 1000 && event.code !== 1001) {
        // This appears to be an unexpected close, reset the reconnected status
        isReconnectedRef.current = false;
      }
      
      // Only schedule reconnect if we're not already successfully reconnected
      if (!isReconnectedRef.current) {
        scheduleReconnect();
      } else {
        console.log("Connection closed but not scheduling reconnect because we're already successfully reconnected");
      }
    });

    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      // Don't schedule reconnect here, as close event will be fired afterward
    });
  }, []);

  // Schedule a reconnection attempt
  const scheduleReconnect = useCallback(() => {
    // Skip reconnection if we're already successfully reconnected
    if (isReconnectedRef.current) {
      console.log('Skipping reconnect as we are already successfully reconnected');
      return;
    }
    
    if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttemptsRef.current += 1;
      console.log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}...`);
      
      // Exponential backoff for reconnection
      const delay = RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttemptsRef.current - 1);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        // Skip if we've reconnected while waiting
        if (isReconnectedRef.current) {
          console.log('Already reconnected while waiting, skipping scheduled reconnect');
          return;
        }
        
        console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
        connectWebSocket(true); // Use reconnect token if available
      }, delay);
    } else {
      console.log('Maximum reconnect attempts reached. Giving up automatic reconnection.');
    }
  }, [connectWebSocket]);

  // Setup WebSocket connection
  useEffect(() => {
    connectWebSocket(false); // Initial connection doesn't use token

    // Clean up socket connection and timeouts on unmount
    return () => {
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || 
                               socketRef.current.readyState === WebSocket.CONNECTING)) {
        socketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [connectWebSocket]);

  // Handle different types of WebSocket messages
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket server connection confirmed:', message.message);
        // Ensure we mark connection as established
        setIsConnected(true);
        break;
      case 'reconnected':
        console.log('WebSocket reconnection successful:', message.message);
        // Update connection status
        setIsConnected(true);
        // Reset reconnect attempts since we're successfully reconnected
        reconnectAttemptsRef.current = 0;
        // Mark as successfully reconnected to prevent further reconnection attempts
        isReconnectedRef.current = true;
        break;
      case 'progress':
        if (message.progress !== undefined) {
          setDownloadProgress(message.progress);
          if (message.jobId !== undefined) {
            setCurrentJobId(message.jobId);
          }
        }
        break;
      case 'downloadProgress':
        if (message.progress !== undefined) {
          console.log(`Processing download progress: ${message.progress}%`, message);
          setDownloadProgress(message.progress);
          // Note: In this case we use requestId instead of jobId
          // but we don't need to track it in state at the moment
        }
        break;
      case 'telegramUploadProgress':
        if (message.progress !== undefined) {
          setUploadProgress(message.progress);
        }
        break;
      case 'error':
        console.error('WebSocket error message:', message.message);
        break;
      case 'complete':
        // Handle completion message
        if (message.jobId !== undefined) {
          // If it has a jobId, it's a download operation
          setDownloadProgress(100);
        } else {
          // Otherwise it's likely an upload operation
          setUploadProgress(100);
        }
        break;
      default:
        console.log('Unhandled WebSocket message type:', message.type);
    }
  };

  return {
    isConnected,
    uploadProgress,
    downloadProgress,
    currentJobId,
    // Method to manually reset progress
    resetProgress: () => {
      setUploadProgress(null);
      setDownloadProgress(null);
      setCurrentJobId(null);
    },
    // Method to manually reconnect the WebSocket
    reconnect: () => {
      console.log("Manual reconnection requested");
      reconnectAttemptsRef.current = 0; // Reset attempt counter
      connectWebSocket();
    }
  };
}