export interface RouteAdapter {
  useLocation: () => { pathname: string };
  Link: any;
}

export interface LinkProps {
  to: string;
  className?: string;
  children: any;
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: any;
}

export interface SidebarRouteAdapterProps {
  children: React.ReactNode;
  adapter?: RouteAdapter;
}
