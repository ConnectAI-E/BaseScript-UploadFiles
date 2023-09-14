import './App.css';
import { useTranslation } from 'react-i18next';
import React, { Suspense } from 'react';


export default function App() {
  const { t } = useTranslation();
  //@ts-ignore
  window.t = t
  const UploadFile = React.lazy(() => import('./pages/uploadFile'));
  const loading = <div className='suspense-loading'>
  <div className="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
  </div>

  return <Suspense fallback={loading}>
    <UploadFile />
  </Suspense>;
}