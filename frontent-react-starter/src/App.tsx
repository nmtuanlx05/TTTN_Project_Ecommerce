import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { RouteFallback } from "@/components/shared/route-fallback"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { AuthBootstrap } from "@/features/auth/auth-bootstrap"
import { adminRoutes } from "@/routes/admin-routes"
import { authRoutes } from "@/routes/auth-routes"
import { storefrontRoutes } from "@/routes/storefront-routes"
import "./global.css"

/** Trang nội bộ cho dev, nạp muộn để không nằm trong chunk của storefront. */
const StyleguidePage = lazy(() => import("@/pages/styleguide"))

function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap>
        <ToastProvider>
          <Routes>
            {authRoutes}
            {storefrontRoutes}
            {adminRoutes}
            <Route
              path="/styleguide"
              element={
                <Suspense fallback={<RouteFallback className="min-h-dvh" />}>
                  <StyleguidePage />
                </Suspense>
              }
            />
          </Routes>
          <ToastViewport />
        </ToastProvider>
      </AuthBootstrap>
    </BrowserRouter>
  )
}

export default App
