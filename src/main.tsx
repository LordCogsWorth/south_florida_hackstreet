import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ARPage from './routes/ARPage'
import ARPageTimed from './routes/ARPageTimed'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/ar', element: <ARPage /> },
  { path: '/ar-timed', element: <ARPageTimed /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
