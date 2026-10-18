import {initializePwaInstall} from './app/pwa-install';
import {initializeDisplayMode} from './app/display-mode';
import React from 'react';import {createRoot} from 'react-dom/client';import PrivateLogin from './app/private-login';import './app/globals.css';initializeDisplayMode();initializePwaInstall();createRoot(document.getElementById('root')!).render(<PrivateLogin/>);
if(import.meta.env.PROD&&'serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{/* Installation help remains available if registration is unsupported. */});},{once:true});}
