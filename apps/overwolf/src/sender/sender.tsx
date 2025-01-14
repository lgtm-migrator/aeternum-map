import { MantineProvider } from '@mantine/core';
import '../globals.css';
import { StrictMode } from 'react';
import { SettingsProvider } from 'ui/contexts/SettingsContext';
import { PositionProvider } from '../contexts/PositionContext';
import { waitForOverwolf } from 'ui/utils/overwolf';
import styles from './Sender.module.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Welcome from './Welcome';
import Streaming from './Streaming';
import ErrorBoundary from 'ui/components/ErrorBoundary/ErrorBoundary';
import { initPlausible } from 'ui/utils/stats';
import { createRoot } from 'react-dom/client';
import Ads from '../components/Ads/Ads';
import { useUserStore } from 'ui/utils/userStore';
import AppHeader from '../components/AppHeader/AppHeader';

const root = createRoot(document.querySelector('#root')!);

function Sender(): JSX.Element {
  const account = useUserStore((state) => state.account);

  return (
    <div className={styles.container}>
      <AppHeader />
      <main className={styles.main}>
        {account ? <Streaming /> : <Welcome />}
      </main>
      <ErrorBoundary>
        <Ads active />
      </ErrorBoundary>
      <ToastContainer
        theme="dark"
        pauseOnHover={false}
        autoClose={3000}
        pauseOnFocusLoss={false}
        style={{ marginTop: 32 }}
      />
    </div>
  );
}

waitForOverwolf().then(() => {
  root.render(
    <StrictMode>
      <MantineProvider
        theme={{
          colorScheme: 'dark',
        }}
      >
        <SettingsProvider>
          <PositionProvider>
            <Sender />
          </PositionProvider>
        </SettingsProvider>
      </MantineProvider>
    </StrictMode>
  );
});

initPlausible();
