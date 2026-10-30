import React from 'react';
import {createRoot} from 'react-dom/client';
import Studio from './page';
import './globals.css';
if(new URLSearchParams(location.hash.slice(1)).get('audience')==='1')document.documentElement.classList.add('audience-document');
createRoot(document.getElementById('root')!).render(<Studio/>);
