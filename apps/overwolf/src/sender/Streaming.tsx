import { patchLiveShareToken } from 'ui/components/ShareLiveStatus/api';
import { copyTextToClipboard } from 'ui/utils/clipboard';
import useShareLivePosition from './useShareLivePosition';
import { writeError } from 'ui/utils/logs';
import CopyIcon from 'ui/components/icons/CopyIcon';
import RefreshIcon from 'ui/components/icons/RefreshIcon';
import BroadcastIcon from 'ui/components/icons/BroadcastIcon';
import { classNames } from 'ui/utils/styles';
import { toast } from 'react-toastify';
import { v4 as uuid } from 'uuid';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import styles from './Streaming.module.css';
import MenuIcon from 'ui/components/icons/MenuIcon';
import Settings from './Settings';
import ServerRadioButton from 'ui/components/LiveServer/ServerRadioButton';
import useServers from 'ui/components/ShareLiveStatus/useServers';
import SyncStatusSender from '../components/SyncStatus/SyncStatusSender';
import useMinimap from '../components/useMinimap';
import { useIsNewWorldRunning } from '../components/store';
import { useUserStore } from 'ui/utils/userStore';
import shallow from 'zustand/shallow';

function Streaming(): JSX.Element {
  const { account, refreshAccount } = useUserStore(
    (state) => ({
      account: state.account!,
      refreshAccount: state.refreshAccount,
    }),
    shallow
  );
  const [token, setToken] = useState(() => account.liveShareToken || uuid());
  const [serverUrl, setServerUrl] = useState(
    () => account.liveShareServerUrl || null
  );
  const { status, isConnected, isSharing, setIsSharing, peerConnections } =
    useShareLivePosition();
  const newWorldIsRunning = useIsNewWorldRunning();
  const [showSettings, setShowSettings] = useState(false);
  const [showMinimap, setShowMinimap] = useMinimap();
  const servers = useServers();

  useEffect(() => {
    if (!serverUrl || !servers.some((server) => server.url === serverUrl)) {
      const onlineServers = [...servers]
        .filter((server) => server.delay)
        .sort((a, b) => a.delay! - b.delay!);
      const server = onlineServers[0];
      if (server) {
        setServerUrl(server.url);
      }
    }
  }, [servers, serverUrl]);

  useEffect(() => {
    refreshAccount();
  }, []);

  useEffect(() => {
    if (account.liveShareToken) {
      setToken(account.liveShareToken);
    }
    if (account.liveShareServerUrl) {
      setServerUrl(account.liveShareServerUrl);
    }
  }, [account.liveShareToken, account.liveShareServerUrl]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSharing) {
      setIsSharing(false);
      return;
    }

    if (!token || !serverUrl) {
      toast.error('Token and server are required 🙄');
      return;
    }

    patchLiveShareToken(token, serverUrl)
      .then(() => refreshAccount())
      .then(() => setIsSharing(true))
      .catch((error) => writeError(error));
  }

  const players = status ? Object.values(status.group) : [];

  return (
    <div className={styles.streaming}>
      <p className={styles.user}>
        <span>
          Welcome back, {account!.name}!<br />
          <SyncStatusSender newWorldIsRunning={newWorldIsRunning} />
        </span>{' '}
        <button
          onClick={() => setShowSettings(true)}
          style={{ alignSelf: 'baseline' }}
        >
          <MenuIcon />
        </button>
      </p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <p className={styles.guide}>
          Use the token shown below on{' '}
          <a href="https://aeternum-map.gg" target="_blank">
            aeternum-map.gg
          </a>{' '}
          or{' '}
          <a href="https://newworld-map.com" target="_blank">
            newworld&#8209;map.com
          </a>{' '}
          to see your live location on the map. You can use any device that has
          a browser. Share this token and server with your friends to see each
          others' location 🤗.
        </p>
        <div>
          Server
          {servers.map((server) => (
            <ServerRadioButton
              key={server.name}
              disabled={isSharing}
              server={server}
              checked={serverUrl === server.url}
              onChange={setServerUrl}
            />
          ))}
        </div>
        <div className={styles.tokenContainer}>
          <label className={styles.label}>
            Token
            <input
              disabled={isSharing}
              value={token}
              placeholder="Use this token to access your live status..."
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <button
            className={styles.action}
            type="button"
            onClick={() => setToken(uuid())}
            title="Generate Random Token"
            disabled={isSharing}
          >
            <RefreshIcon />
          </button>
          <button
            className={styles.action}
            type="button"
            disabled={!token || !serverUrl}
            onClick={() => {
              copyTextToClipboard(token);
            }}
            title="Copy Token"
          >
            <CopyIcon />
          </button>
        </div>
        <div className={styles.status}>
          <aside>
            <h5>Senders</h5>
            <ul className={styles.list}>
              {players.length > 0 ? (
                players.map((player) => (
                  <li key={player.username}>
                    {player.username ? player.username : player.steamName}
                  </li>
                ))
              ) : (
                <li>No connections</li>
              )}
            </ul>
          </aside>
          <button
            disabled={!token}
            type="submit"
            className={classNames(
              styles.submit,
              isSharing && !isConnected && styles.connecting,
              isSharing && isConnected && styles.connected
            )}
          >
            <BroadcastIcon />
            {isSharing && !isConnected && 'Connecting'}
            {isSharing && isConnected && 'Sharing'}
            {!isSharing && 'Share'}
          </button>

          <aside>
            <h5>Receivers</h5>
            <ul className={styles.list}>
              {status?.connections.length ? (
                status.connections.map((connection) => (
                  <li key={connection}>
                    Browser{' '}
                    {peerConnections[connection]?.open
                      ? '(Direct)'
                      : '(Socket)'}
                  </li>
                ))
              ) : (
                <li>No connections</li>
              )}
            </ul>
          </aside>
        </div>
      </form>
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          showMinimap={showMinimap}
          onShowMinimap={setShowMinimap}
        />
      )}
    </div>
  );
}

export default Streaming;
