import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import a16zImg from '../assets/a16z.png';
import starImg from '../assets/star.svg';
import helpImg from '../assets/help.svg';
import ReactModal from 'react-modal';
import StrudelMusicButton from './components/buttons/StrudelMusicButton.tsx';
import Button from './components/buttons/Button.tsx';

import InteractButton from './components/buttons/InteractButton.tsx';
import GameSimple from './components/GameSimple.tsx';


export default function AppStatic() {
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between font-body game-background">

      <ReactModal
        isOpen={helpModalOpen}
        onRequestClose={() => setHelpModalOpen(false)}
        style={modalStyles}
        contentLabel="Help modal"
        ariaHideApp={false}
      >
        <div className="font-body">
          <h1 className="text-center text-6xl font-bold font-display game-title">Migration Complete</h1>
          <p>
            Welcome to the static version of AI Town! This application has been successfully migrated 
            from Convex to a fully serverless, browser-only architecture.
          </p>
          <h2 className="text-4xl mt-4">New Architecture</h2>
          <p>
            The application now uses DuckDB-WASM, PGLite, and Parquet files for local data storage, 
            eliminating the need for server-side dependencies.
          </p>
          <h2 className="text-4xl mt-4">Benefits</h2>
          <ul className="text-left space-y-1 mt-2">
            <li>• No server required</li>
            <li>• Fully static deployment</li>
            <li>• Works offline</li>
            <li>• Compatible with GitHub Pages</li>
            <li>• Browser-only data processing</li>
          </ul>
        </div>
      </ReactModal>

      <div className="w-full min-h-screen relative isolate overflow-hidden p-4 lg:p-8 shadow-2xl flex flex-col">
        <h1 className="mx-auto text-4xl p-3 sm:text-6xl lg:text-8xl font-bold font-display leading-none tracking-wide game-title w-full text-center mb-4">
          Type Town
        </h1>

        <div className="flex-1 max-w-full overflow-hidden">
          <GameSimple />
        </div>

        <footer className="justify-end bottom-0 left-0 w-full flex items-center mt-4 gap-3 p-6 flex-wrap pointer-events-none">
          <div className="flex gap-4 flex-grow pointer-events-none">
            <StrudelMusicButton />
            <Button href="https://github.com/USTypology/ustypology.github.io" imgUrl={starImg}>
              Star
            </Button>
            <InteractButton />
            <Button imgUrl={helpImg} onClick={() => setHelpModalOpen(true)}>
              Help
            </Button>
          </div>
          <a href="https://a16z.com">
            <img className="w-8 h-8 pointer-events-auto" src={a16zImg} alt="a16z" />
          </a>
        </footer>
        <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
      </div>
    </main>
  );
}

const modalStyles = {
  overlay: {
    backgroundColor: 'rgb(0, 0, 0, 75%)',
    zIndex: 12,
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '50%',

    border: '10px solid rgb(23, 20, 33)',
    borderRadius: '0',
    background: 'rgb(35, 38, 58)',
    color: 'white',
    fontFamily: '"Upheaval Pro", "sans-serif"',
  },
};