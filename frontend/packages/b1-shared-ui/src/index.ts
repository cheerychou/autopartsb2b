export type { IconComponent } from './types';

// Shared API types
export type { ApiResponse, PaginationParams, DRFPaginatedResponse, PagedResponse, DateRange, Option } from './types/api';

// Shared domain types (API contract enums — used by both web and mobile)
// 2026-08-29 类型层重构后：状态枚举为 union 直写（纯类型），值访问对象与 LABELS 为值导出。
export type { OrderStatus, WorkOrderStatus, WorkOrderPriority } from './types/domain';
export { ORDER_STATUSES, WORK_ORDER_STATUSES, ORDER_STATUS_LABELS, WORK_ORDER_STATUS_LABELS, WORK_ORDER_PRIORITY_LABELS } from './types/domain';

export { Button, buttonVariants } from './components/ui/button';
export type { ButtonProps } from './components/ui/button';

export { Badge } from './components/ui/badge';

export { StatusBadge } from './components/ui/status-badge';
export type { StatusBadgeProps, StatusTone } from './components/ui/status-badge';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './components/ui/card';

export { SectionTitle } from './components/ui/section-title';
export type { SectionTitleProps } from './components/ui/section-title';

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './components/ui/table';
export type { TableDensity } from './components/ui/table';

export { Icons } from './components/ui/icons';
export type { IconName } from './components/ui/icons';

export { Input } from './components/ui/input';

export { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';

export { BrandLogo } from './components/ui/brand-logo';
export type { BrandLogoProps } from './components/ui/brand-logo';
export { VersionBadge, getBuildInfo } from './components/ui/version-badge';
export type { VersionBadgeProps } from './components/ui/version-badge';

export { Alert, AlertDescription } from './components/ui/alert';

export { Separator } from './components/ui/separator';

export { Checkbox } from './components/ui/checkbox';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './components/ui/accordion';

export { CopyableText } from './components/ui/copyable-text';
export type { CopyableTextProps, MaskType } from './components/ui/copyable-text';

export { FilterBar } from './components/filter/filter-bar';
export type { FilterBarProps, FilterType, FilterOption, FilterField, FilterValue } from './components/filter/filter-bar';

export { UserInfo } from './components/ui/user-info';
export type { UserInfoProps } from './components/ui/user-info';

export { NotificationBell } from './components/ui/notification-bell';
export type { NotificationItem } from './components/ui/notification-bell';

export { UserDropdownMenu } from './components/ui/user-dropdown-menu';

export { AppFooter } from './components/ui/app-footer';

export { CustomerInfoCard } from './components/ui/customer-info-card';
export type { CustomerInfoCardProps } from './components/ui/customer-info-card';
export type { CustomerInfoData, IndividualCustomerInfo, CorporateCustomerInfo, CustomerInfo, VehicleInfo } from './components/ui/customer-vehicle-card.types';

export { VehicleInfoCard } from './components/ui/vehicle-info-card';
export type { VehicleInfoCardProps } from './components/ui/vehicle-info-card';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/ui/dropdown-menu';

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './components/ui/alert-dialog';

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './components/ui/sidebar';

export { SidebarMenu as NavMenu } from './components/ui/sidebar-menu';
export type { IMenuItem, ISidebarMenuProps } from './components/ui/sidebar-menu';

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './components/ui/sheet';

export { SidebarThemeProvider, useSidebarTheme } from './components/ui/sidebar-theme-context';
export type { SidebarThemeProviderProps } from './components/ui/sidebar-theme-context';

export { defaultSidebarTheme, sidebarThemes, mergeSidebarTheme } from './components/ui/sidebar-theme';
export type { SidebarTheme, SidebarThemeColors, SidebarThemeSizes, SidebarThemeName } from './components/ui/sidebar-theme';

export { SidebarContextProvider } from './components/ui/sidebar-provider';
export type { SidebarContextProviderProps } from './components/ui/sidebar-provider';

export { RouteAdapterProvider, useRouteAdapter } from './components/ui/sidebar-route-adapter-context';
export type { RouteAdapterProviderProps } from './components/ui/sidebar-route-adapter-context';

export { ReactRouterAdapter } from './components/ui/sidebar-react-router-adapter';
export type { RouteAdapter, LinkProps } from './components/ui/sidebar-route-adapter';

export { PasswordLoginForm } from './components/auth/password-login-form';

export { SMSLoginForm } from './components/auth/sms-login-form';

export { LoginPage } from './components/auth/login-page';
export type { LoginPageProps } from './components/auth/login-page';

export type { LoginCredentials, AuthError, PasswordLoginFormProps, SMSLoginFormProps } from './components/auth/types';

// Form components
export { Form, useForm, useFormContext, zodResolver } from './components/form';
export type { FormProps, UseFormReturn, FieldValues, DefaultValues, SubmitHandler, UseFormProps } from './components/form';

// re-export zod 命名空间，统一从 @cdd/b1-shared-ui 导入 z（避免各应用重复依赖 zod）
export { z } from 'zod';

export { FormField, FormFieldLegacy } from './components/form/form-field';
export type { FormFieldProps, FormFieldLegacyProps } from './components/form/form-field';

export { FormFooter } from './components/form/form-footer';
export type { FormFooterProps } from './components/form/form-footer';

export { FormSection } from './components/form/form-section';
export type { FormSectionProps } from './components/form/form-section';

export { MultiSelect } from './components/form/multiselect';
export type { MultiSelectProps, MultiSelectOption } from './components/form/multiselect';

export { FormLabel } from './components/form/form-label';
export type { FormLabelProps } from './components/form/form-label';

export { FormMessage } from './components/form/form-message';
export type { FormMessageProps } from './components/form/form-message';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './components/form/select';

export { Textarea } from './components/form/textarea';
export type { TextareaProps } from './components/form/textarea';

export { RadioGroup, RadioGroupItem } from './components/form/radio-group';
export type { RadioGroupProps, RadioGroupItemProps } from './components/form/radio-group';

export { Switch } from './components/form/switch';
export type { SwitchProps } from './components/form/switch';

export { UnifiedDatePicker } from './components/form/unified-date-picker';
export type { UnifiedDatePickerProps, UnifiedDatePickerMode, DatePickerPreset } from './components/form/unified-date-picker';

export { InputNumber } from './components/form/input-number';
export type { InputNumberProps } from './components/form/input-number';

export { InputPassword } from './components/form/input-password';
export type { InputPasswordProps } from './components/form/input-password';

export { Upload } from './components/form/upload';
export type { UploadProps, FileItem } from './components/form/upload';

export { VerificationCode } from './components/form/verification-code';
export type { VerificationCodeProps } from './components/form/verification-code';

export { PhoneInput } from './components/form/phone-input';
export type { PhoneInputProps, CountryCode } from './components/form/phone-input';

export { EmailInput } from './components/form/email-input';
export type { EmailInputProps } from './components/form/email-input';

export { UrlInput } from './components/form/url-input';
export type { UrlInputProps } from './components/form/url-input';

export { Transfer } from './components/form/transfer';
export type { TransferProps, TransferItem } from './components/form/transfer';

// Layout components
export { Grid, GridItem } from './components/layout';
export type { GridProps, GridItemProps } from './components/layout';

export { Space } from './components/layout';
export type { SpaceProps, SpaceDirection, SpaceAlign, SpaceSize } from './components/layout';

export { Divider } from './components/layout';
export type { DividerProps, DividerOrientation, DividerType, DividerAlign, DividerSize } from './components/layout';

export { Container } from './components/layout';
export type { ContainerProps, ContainerSize, ContainerAlign } from './components/layout';

export { Row, Col } from './components/layout';
export type { RowProps, ColProps } from './components/layout';

export { Layout, Header, Footer, Sider, Content } from './components/layout';
export type { LayoutProps, HeaderProps, FooterProps, SiderProps, ContentProps } from './components/layout';

// Feedback components
export { Message, message, Drawer, Popconfirm } from './components/feedback';
export type {
  MessageProps,
  MessageType,
  DrawerProps,
  DrawerPlacement,
  PopconfirmProps,
} from './components/feedback';

// Business components
export { ActionButtons } from './components/business';
export type { ActionButtonsProps, ActionButton, ActionType } from './components/business';

export { BatchActions } from './components/business';
export type { BatchActionsProps, BatchAction } from './components/business';

export { QuickActions } from './components/business';
export type { QuickActionsProps, QuickAction, QuickActionType } from './components/business';

export { StatusTimeline } from './components/business';
export type { StatusTimelineProps, StatusTimelineItem, StatusType } from './components/business';

export { CommentList } from './components/business';
export type { CommentListProps, Comment } from './components/business';

export { FileList } from './components/business';
export type { FileListProps, FileItem as BusinessFileItem } from './components/business';

export { ImageGallery } from './components/business';
export type { ImageGalleryProps, GalleryImage } from './components/business';

export { VehicleModelSelector } from './components/business';
export type {
  VehicleModelSelectorProps,
  VehicleModelSelection,
  VehicleModelSources,
  VehicleModelPage,
  VehicleBrand,
  VehicleSeries,
  VehicleModel,
} from './components/business';

// Common components
export { DataTable } from './components/common/data-table';
export type { Column, DataTableProps, DataTableExpandable } from './components/common/data-table';

export { DateRangeInput } from './components/common/date-range-input';
export type { DateRangeInputProps } from './components/common/date-range-input';

export { PageContainer } from './components/common/page-container';
export type { PageContainerProps } from './components/common/page-container';

export { PageHeader } from './components/common/page-header';
export type { PageHeaderProps } from './components/common/page-header';

export { SegmentTabsA } from './components/common/segment-tabs';
export type { SegmentTabsAProps, SegmentItem } from './components/common/segment-tabs';

export { KanbanColumn } from './components/common/kanban-column';
export type { KanbanColumnProps } from './components/common/kanban-column';

export { KanbanCard } from './components/common/kanban-card';
export type { KanbanCardProps } from './components/common/kanban-card';

export { KanbanBoard } from './components/common/kanban-board';
export type { KanbanBoardProps } from './components/common/kanban-board';

export { SearchForm } from './components/common/search-form';
export type { SearchFormProps, SearchFormField, SearchFormValues } from './components/common/search-form';

export { StatusFilter } from './components/common/status-filter';
export type { StatusFilterProps } from './components/common/status-filter';

export { StandardListPage } from './components/common/standard-list-page';
export type { StandardListPageProps } from './components/common/standard-list-page';

export { ReportPage, REPORT_DATE_PRESETS, presetDateRange } from './components/common/report-page';
export type { ReportPageProps, ReportDatePreset } from './components/common/report-page';

export { StepNavigator } from './components/common/step-navigator';
export type { StepNavigatorProps, StepNavigatorStep } from './components/common/step-navigator';

export { WizardPage } from './components/common/wizard-page';
export type { WizardPageProps } from './components/common/wizard-page';

export { DateToolbar } from './components/common/date-toolbar';
export type { DateToolbarProps } from './components/common/date-toolbar';

export { TableActions } from './components/common/table-actions';
export type { TableActionsProps, ActionItem, MoreMenuItem } from './components/common/table-actions';

export { CalendarView } from './components/common/calendar-view';
export type { CalendarViewProps, CalendarEvent } from './components/common/calendar-view';

export { DaysCardView } from './components/common/days-card-view';
export type { DaysCardViewProps, DaysCardEvent } from './components/common/days-card-view';

export { InfoField, InfoFieldGroup } from './components/common/info-field';
export type { InfoFieldProps, InfoFieldGroupProps } from './components/common/info-field';

export { DetailPageLayout, DetailSection } from './components/common/detail-page-layout';
export type { DetailPageLayoutProps, DetailPageAction, DetailSectionProps } from './components/common/detail-page-layout';
export { SettingsPage } from './components/common/settings-page';
export type { SettingsPageProps } from './components/common/settings-page';
export { OverviewPage } from './components/common/overview-page';
export type { OverviewPageProps } from './components/common/overview-page';
export { Tree } from './components/common/tree';
export type { TreeProps, TreeNodeData } from './components/common/tree';
export { EntryGrid } from './components/common/entry-grid';
export type { EntryGridProps, EntryItem } from './components/common/entry-grid';

export { SystemInfoRow } from './components/common/system-info-row';
export type { SystemInfoRowProps } from './components/common/system-info-row';

export { ConfirmDialog } from './components/common/confirm-dialog';
export type { ConfirmDialogProps, ConfirmVariant } from './components/common/confirm-dialog';

export { StageFlowBar } from './components/common/stage-flow-bar';
export type { StageFlowBarProps, StageFlowStep, StepStatus } from './components/common/stage-flow-bar';

export { EditableCardHeader } from './components/common/editable-card-header';
export type { EditableCardHeaderProps } from './components/common/editable-card-header';

export type { StatusConfig, StatusMap } from './components/common/status-config';
export {
  getStatusConfig,
  ACTIVE_INACTIVE_STATUS,
  PART_STATUS,
  INVENTORY_STATUS,
  STOCK_LEVEL_STATUS,
  TRANSFER_ORDER_STATUS,
  PROCUREMENT_REQUEST_STATUS,
  PROCUREMENT_RETURN_STATUS,
  SETTLEMENT_STATUS,
  FINANCE_RECORD_STATUS,
  WORK_ORDER_STATUS,
  APPOINTMENT_STATUS,
  STOCKTAKE_STATUS,
  WAREHOUSE_DOC_STATUS,
  PURCHASE_ORDER_STATUS,
  PAYMENT_STATUS,
  RECEIPT_STATUS,
  SEVERITY_QUALITY,
  SEVERITY_DTC,
  SEVERITY_REPAIR_CASE,
  DP_RECORD_STATUS,
  DP_MODEL_STATUS,
  TERM_INDUSTRY_STATUS,
  TERM_ALIAS_STATUS,
  NATIONAL_STANDARD_STATUS,
  OEM_LICENSE_STATUS,
  OEM_DATA_SOURCE_STATUS,
  OEM_DATA_ACCESS_STATUS,
  FITMENT_VERIFIED_STATUS,
  FITMENT_BATCH_STATUS,
  COOPERATION_STATUS,
  REPAIR_CASE_STATUS,
  QUALITY_APPROVAL_STATUS,
  ANOMALY_STATUS,
  SYNC_TASK_STATUS,
  SYNC_RECORD_STATUS,
  TENANT_STATUS,
  PLATFORM_USER_STATUS,
  LEAD_STATUS,
  CONTRACT_STATUS,
  DELIVERY_PROJECT_STATUS,
  DELIVERY_STAGE_STATUS,
  INVOICE_RECORD_STATUS,
  PAYMENT_RECORD_STATUS,
  TENANT_SUBSCRIPTION_STATUS,
  SUBSCRIPTION_ORDER_STATUS,
  TICKET_STATUS,
  TICKET_PRIORITY,
  ORDER_LIFECYCLE_STATUS,
  RESCUE_ORDER_STATUS,
  VEHICLE_STATUS,
  ACCIDENT_INQUIRY_STATUS,
  CUSTOMER_ACCOUNT_STATUS,
} from './components/common/status-config';

// UI components
export { PermissionGuard, type PermissionGuardProps } from './components/auth/permission-guard';
export { CrudFormDialog } from './components/common/crud-form-dialog';
export type { CrudFieldDescriptor, CrudFormDialogProps } from './components/common/crud-form-dialog';
export { EmptyState, EmptyStateSmall, EmptyStateMedium, EmptyStateLarge } from './components/ui/empty-state';
export type { EmptyStateProps, EmptyStateVariant, EmptyStateSize } from './components/ui/empty-state';

export { ErrorState } from './components/ui/error-state';
export type { ErrorStateProps } from './components/ui/error-state';

export { AsyncState } from './components/ui/async-state';
export type { AsyncStateProps } from './components/ui/async-state';

export { Spinner } from './components/ui/spinner';
export type { SpinnerProps } from './components/ui/spinner';

// Data display components
export {
  StatCard,
  StatGrid,
  MetricCardGrid,
  Progress,
  Rate,
  Timeline,
  TimelineItem,
} from './components/data-display';
export type {
  StatCardProps,
  StatGridProps,
  MetricCardItem,
  MetricCardGridProps,
  StatStatus,
  StatTrend,
  ProgressProps,
  ProgressType,
  RateProps,
  TimelineProps,
  TimelineItemProps,
  TimelineMode,
} from './components/data-display';

export { ThemeToggle } from './components/ui/theme-toggle';
export type { ThemeToggleProps } from './components/ui/theme-toggle';

export { Modal } from './components/ui/modal';
export type { ModalProps, ModalSize, ModalPosition } from './components/ui/modal';

export { Pagination } from './components/ui/pagination';
export type { PaginationProps } from './components/ui/pagination';

export { Skeleton } from './components/ui/skeleton';

export { Tag, CheckableTag, EditableTag, TagGroup } from './components/ui/tag';
export type { TagProps, TagVariant, TagSize, CheckableTagProps, EditableTagProps, TagGroupProps } from './components/ui/tag';

export { Carousel, CarouselItem } from './components/ui/carousel';
export type { CarouselProps, CarouselItemProps } from './components/ui/carousel';

export { Slider } from './components/ui/slider';
export type { SliderProps } from './components/ui/slider';

export { ScrollArea, ScrollBar } from './components/ui/scroll-area';

export { Label } from './components/ui/label';

export { Breadcrumb, SimpleBreadcrumb, PageBreadcrumb } from './components/ui/breadcrumb';
export type { SimpleBreadcrumbProps, PageBreadcrumbProps, BreadcrumbItemData } from './components/ui/breadcrumb';

// Hooks
export * from './hooks';

export { Calendar } from './components/ui/calendar';

export { Popover, PopoverTrigger, PopoverContent } from './components/ui/popover';

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';

export { ToasterProvider } from './components/ui/sonner';

// Utility functions
export { normalizeDateRange, parseDateRange } from './lib/date-utils';
export {
  toNumber,
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
  formatNumberCn,
  formatMoneyCn,
  formatRelativeTime,
  formatFileSize,
  maskPhone,
} from './lib/format';
export { toErrorMessage } from './lib/normalize-error';

// Auth-prefixed storage utilities（认证前缀存储，非加密；FEQ-08 命名纠偏）
export {
  setAuthItem,
  getAuthItem,
  removeAuthItem,
  clearAuthData,
  isDevelopmentMode,
  getEnvVar,
  storageHealthCheck,
  getStorageUsage,
  authStorage,
  type AuthStorageType,
  type StorageApi,
  type StorageType,
} from './lib/authStorage';

// Asset utilities
export { getAssetPath } from './lib/asset-utils';

// Menu filtering utilities（菜单权限/特性过滤，store-web 与 platform-web 共用）
export {
  filterMenuByFeatures,
  filterMenuByPermissions,
  filterMenuByRoles,
} from './lib/menu-filter';
export type { IMenuItemWithFeature } from './lib/menu-filter';

// Chart components (shadcn/ui 规范)
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from './components/ui/chart';
export type { ChartConfig } from './components/ui/chart';

export { LineChart, BarChart, PieChart, AreaChart, ColumnChart } from './components/chart';

// Feature registry
export { Feature, ALL_FEATURES, FeatureGroups, isFeatureEnabled, findFeatureModule } from './constants/features';
export type { FeatureKey, FeatureGroupDef } from './constants/features';
export type {
  ChartDataPoint,
  ChartAxisConfig,
  ChartLegendConfig,
  ChartTooltipConfig,
  ChartTitleConfig,
  BaseChartProps,
  LineChartProps,
  BarChartProps,
  PieChartProps,
  AreaChartProps,
  ColumnChartProps,
} from './components/chart';

// Shared stores — auth types and permission utilities
export {
  type BaseUser,
  type SubscriptionFeatures,
  type BaseAuthState,
  type UserRole,
  checkPermission,
  checkAnyPermission,
  checkRole,
  checkAnyRole,
  mapAuthResultToUser,
} from './stores/auth-types';
