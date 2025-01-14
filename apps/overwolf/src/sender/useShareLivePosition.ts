import { useEffect, useState } from 'react';
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { usePosition } from '../contexts/PositionContext';
import { usePersistentState } from 'ui/utils/storage';
import { toast } from 'react-toastify';
import type { Group } from 'ui/utils/useReadLivePosition';
import useShareHotkeys from './useShareHotkeys';
import type { DataConnection } from 'peerjs';
import Peer from 'peerjs';
import { useSettings } from 'ui/contexts/SettingsContext';
import { useUserStore } from 'ui/utils/userStore';

const peerConnections: { [key: string]: DataConnection } = {};

const sendToPeers = (data: unknown) => {
  Object.values(peerConnections).forEach((peerConnection) => {
    if (peerConnection.open) {
      peerConnection.send(data);
    }
  });
};

function useShareLivePosition() {
  const { peerToPeer } = useSettings();
  const [isSharing, setIsSharing] = usePersistentState(
    'share-live-position',
    false
  );
  const [socket, setSocket] = useState<Socket<
    DefaultEventsMap,
    DefaultEventsMap
  > | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<{
    group: Group;
    connections: string[];
  } | null>(null);

  const { position, location, region, worldName, map, username } =
    usePosition();
  const account = useUserStore((state) => state.account);

  const steamId = account!.steamId;

  useShareHotkeys(socket);

  useEffect(() => {
    if (!isSharing) {
      return;
    }
    if (!account?.liveShareToken || !account.liveShareServerUrl) {
      setIsSharing(false);
      return;
    }

    const peer = peerToPeer ? new Peer({ debug: 2 }) : null;
    const openPromise = new Promise((resolve) => {
      peer?.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        resolve(id);
      });
    });

    const newSocket = io(account.liveShareServerUrl, {
      query: {
        token: account.liveShareToken,
        steamId: account!.steamId,
        steamName: account!.name,
        isOverwolfApp: true,
      },
      transports: ['websocket'],
    });
    setSocket(newSocket);

    const updateStatus = () => {
      newSocket.emit('status', (group: Group, connections: string[]) => {
        setStatus({ group, connections });
        sendToPeers({ group });

        if (peer) {
          connections.forEach(async (connection) => {
            await openPromise;
            if (!peerConnections[connection]) {
              const peerId = connection.replace(/[^a-zA-Z ]/g, '');
              console.log(`Connecting to peer ${peerId}`);
              peerConnections[connection] = peer.connect(peerId);

              peerConnections[connection].on('error', (error: Error) => {
                console.error(`Peer ${peerId} error`, error);
              });

              peerConnections[connection].on('open', () => {
                console.log(`Peer ${peerId} opened`);
                peerConnections[connection].send({ group });
              });

              peerConnections[connection].on('close', () => {
                console.log(`Peer ${peerId} closed`);
                delete peerConnections[connection];
              });
            }
          });
        }
      });
    };

    newSocket.on('connect', () => {
      setIsConnected(true);
      toast.success('Sharing live status 👌');
      console.log('Sharing live status 👌');
      updateStatus();
    });

    newSocket.on('connected', (isOverwolfApp, steamName) => {
      const message = isOverwolfApp
        ? `${steamName} connected 🎮`
        : 'Website connected 👽';
      toast.info(message);
      console.info(message);
      updateStatus();
    });

    newSocket.on('disconnected', (isOverwolfApp, steamName, clientId) => {
      const message = isOverwolfApp
        ? `${steamName} disconnected 👋`
        : 'Website disconnected 👋';
      toast.info(message);
      console.info(message);
      updateStatus();
      peerConnections[clientId]?.close();
      delete peerConnections[clientId];
    });

    newSocket.io.on('reconnect_attempt', () => {
      setIsConnected(false);
    });

    newSocket.io.on('reconnect_failed', () => {
      toast.error('Reconnection failed');
      console.error('Reconnection failed');
      newSocket.io.connect();
    });

    newSocket.io.on('reconnect', () => {
      console.info('Reconnected');
      setIsConnected(true);
    });

    return () => {
      newSocket.removeAllListeners();
      newSocket.io.removeAllListeners();
      newSocket.close();

      setIsConnected(false);

      peer?.destroy();
      Object.entries(peerConnections).forEach(([clientId, peerConnection]) => {
        peerConnection?.close();
        delete peerConnections[clientId];
      });
      setSocket(null);
      setStatus(null);
      toast.info('Stop sharing live status 🛑');
    };
  }, [isSharing, account, peerToPeer]);

  useEffect(() => {
    if (socket && isConnected) {
      sendToPeers({ steamId, position });
      socket.emit('position', position);
    }
  }, [socket, isConnected, position]);

  useEffect(() => {
    if (socket && isConnected) {
      sendToPeers({ steamId, location });
      socket.emit('location', location);
    }
  }, [socket, isConnected, location]);

  useEffect(() => {
    if (socket && isConnected) {
      sendToPeers({ steamId, worldName });
      socket.emit('worldName', worldName);
    }
  }, [socket, isConnected, worldName]);

  useEffect(() => {
    if (socket && isConnected) {
      sendToPeers({ steamId, map });
      socket.emit('map', map);
    }
  }, [socket, isConnected, map]);

  useEffect(() => {
    if (socket && isConnected) {
      sendToPeers({ steamId, region });
      socket.emit('region', region);
    }
  }, [socket, isConnected, region]);

  useEffect(() => {
    if (socket && isConnected) {
      sendToPeers({ steamId, username });
      socket.emit('username', username);
    }
  }, [socket, isConnected, username]);

  return { status, isConnected, isSharing, setIsSharing, peerConnections };
}

export default useShareLivePosition;
