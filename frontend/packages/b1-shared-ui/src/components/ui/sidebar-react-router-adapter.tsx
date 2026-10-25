import { useLocation, Link as RouterLink } from "react-router-dom";
import type { RouteAdapter, LinkProps } from "./sidebar-route-adapter";

export const ReactRouterAdapter: RouteAdapter = {
  useLocation: () => {
    const location = useLocation();
    return { pathname: location.pathname };
  },
  Link: ({ to, className, children, onClick, ...props }: LinkProps) => {
    return (
      <RouterLink to={to} className={className} onClick={onClick} {...props}>
        {children as any}
      </RouterLink>
    );
  },
};
