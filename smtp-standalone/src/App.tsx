import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { StoreProvider } from "@/hooks/use-store";

// Pages
import Dashboard from "@/pages/dashboard";
import Smtps from "@/pages/smtps";
import Import from "@/pages/import";
import NewSale from "@/pages/new-sale";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import Customers from "@/pages/customers";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/smtps" component={Smtps} />
        <Route path="/import" component={Import} />
        <Route path="/sales/new" component={NewSale} />
        <Route path="/history" component={History} />
        <Route path="/customers" component={Customers} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
