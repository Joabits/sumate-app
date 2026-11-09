import { Navigate, Route, Routes, useParams } from "react-router";
import ActivityDetailPage from "@/activities/pages/ActivityDetailPage";
import ExplorePage from "@/activities/pages/ExplorePage";
import MyActivitiesPage from "@/activities/pages/MyActivitiesPage";
import SearchPage from "@/activities/pages/SearchPage";
import ForgotPasswordPage from "@/auth/pages/ForgotPasswordPage";
import LoginPage from "@/auth/pages/LoginPage";
import ResetPasswordPage from "@/auth/pages/ResetPasswordPage";
import SignupPage from "@/auth/pages/SignupPage";
import VerifyEmailPage from "@/auth/pages/VerifyEmailPage";
import WelcomePage from "@/auth/pages/WelcomePage";
import ConstanciaPage from "@/horas/pages/ConstanciaPage";
import RecentlyPage from "@/participations/pages/RecentlyPage";
import { AppProviders } from "@/shared/components/AppProviders";
import { MainLayout } from "@/shared/components/MainLayout";
import NotFoundPage from "@/shared/components/NotFoundPage";
import { PrivateRoute } from "./PrivateRoute";
import { PublicRoute } from "./PublicRoute";

/** Al cambiar de actividad la página empieza de cero (sin datos de la anterior). */
function ActivityDetailRoute() {
  const { id } = useParams();
  return <ActivityDetailPage key={id} />;
}

/** Todas las rutas de la app. */
export function AppRoutes() {
  return (
    <Routes>
      {/* Solo sin sesión */}
      <Route element={<PublicRoute />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      </Route>

      {/* Con sesión */}
      <Route element={<PrivateRoute />}>
        {/* Better Auth vuelve a /home después de iniciar sesión */}
        <Route path="/home" element={<Navigate to="/explore" replace />} />
        <Route element={<AppProviders />}>
          <Route element={<MainLayout />}>
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/my-activities" element={<MyActivitiesPage />} />
            <Route path="/recently" element={<RecentlyPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Route>
          <Route path="/activities/:id" element={<ActivityDetailRoute />} />
          {/* Constancia imprimible: sin menú ni cabecera */}
          <Route path="/constancia" element={<ConstanciaPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
