import { BrowserRouter, Route, Routes } from "react-router-dom"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { AuthBootstrap } from "@/features/auth/auth-bootstrap"
import NotFoundPage from "@/pages/not-found"
import StyleguidePage from "@/pages/styleguide"
import { adminRoutes } from "@/routes/admin-routes"
import { authRoutes } from "@/routes/auth-routes"
import { storefrontRoutes } from "@/routes/storefront-routes"
import "./global.css"

function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap>
        <ToastProvider>
          <Routes>
            {authRoutes}
            {storefrontRoutes}
            {adminRoutes}
            <Route path="/styleguide" element={<StyleguidePage />} />
            <Route path="*" element={<NotFoundPage fullPage />} />
          </Routes>
          <ToastViewport />
        </ToastProvider>
      </AuthBootstrap>
    </BrowserRouter>
  )
}

export default App
