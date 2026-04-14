import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/client/Index";
import MealPlan from "./pages/client/MealPlan";
import MyMealPlans from "./pages/client/MyMealPlans";
import CommunityMealPlans from "./pages/client/CommunityMealPlans";
import MyRecipes from "./pages/client/MyRecipes";
import Subscription from "./pages/client/Subscription";
import StoreRegistration from "./pages/client/StoreRegistration";
import NearbyRestaurants from "./pages/client/NearbyRestaurants";
import Auth from "./pages/client/Auth";
import AuthCallback from "./pages/client/AuthCallback";
import NotFound from "./pages/client/NotFound";
import Settings from "./pages/client/Settings";
import FoodDiary from "./pages/client/FoodDiary";
import Favorites from "./pages/client/Favorites";
import Onboarding from "./pages/client/Onboarding";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Payments from "./pages/admin/Payments";
import AdminStores from "./pages/admin/Stores";
import DiscountCodes from "./pages/admin/DiscountCodes";
import Recipes from "./pages/admin/Recipes";
import RecipeCategories from "./pages/admin/RecipeCategories";
import Foods from "./pages/admin/Foods";
import MealPlans from "./pages/admin/MealPlans";
import AdminProfile from "./pages/admin/Profile";
import FoodGroups from "./pages/admin/FoodGroups";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Protected client routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meal-plan"
              element={
                <ProtectedRoute>
                  <MealPlan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute skipOnboardingCheck>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diary"
              element={
                <ProtectedRoute>
                  <FoodDiary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-meal-plans"
              element={
                <ProtectedRoute>
                  <MyMealPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community-plans"
              element={
                <ProtectedRoute>
                  <CommunityMealPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-recipes"
              element={
                <ProtectedRoute>
                  <MyRecipes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store-registration"
              element={
                <ProtectedRoute>
                  <StoreRegistration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nearby"
              element={
                <ProtectedRoute>
                  <NearbyRestaurants />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="payments" element={<Payments />} />
              <Route path="stores" element={<AdminStores />} />
              <Route path="discount-codes" element={<DiscountCodes />} />
              <Route path="recipes" element={<Recipes />} />
              <Route path="recipe-categories" element={<RecipeCategories />} />
              <Route path="foods" element={<Foods />} />
              <Route path="meal-plans" element={<MealPlans />} />
              <Route path="food-groups" element={<FoodGroups />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>

            {/* Catch-all route - MUST BE LAST */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
