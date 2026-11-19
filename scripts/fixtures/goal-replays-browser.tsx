import React from 'react';
import {createRoot} from 'react-dom/client';
import MatchStreamPanel from '../../app/match-stream-panel';
import GoalReplaySettings from '../../app/goal-replay-settings';
import '../../app/globals.css';
const league=new URLSearchParams(location.search).get('league')||'uefa.champions';
const game={id:'replay-browser-test',league,date:new Date().toISOString(),state:'in',completed:false,home:{name:'Test Home',score:1},away:{name:'Test Away',score:0}};
createRoot(document.getElementById('root')!).render(<><GoalReplaySettings/><MatchStreamPanel game={game}/></>);
