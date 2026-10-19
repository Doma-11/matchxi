import {createContext,useContext} from 'react';
export const AccountContext=createContext<{username:string}>({username:''});
export const useReportAccess=()=>useContext(AccountContext).username==='Dome11';
