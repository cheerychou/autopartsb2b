import { Card } from './card'
import { Avatar, AvatarFallback } from './avatar'
import type { CustomerInfoData } from './customer-vehicle-card.types'

export interface CustomerInfoCardProps {
  customerInfo: CustomerInfoData
}

export function CustomerInfoCard({ customerInfo }: CustomerInfoCardProps) {
  if (customerInfo.customerType === 'individual') {
    return (
      <Card className="flex flex-col py-8 px-8 gap-4">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-[0_0_60%] flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-background shadow-sm shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {customerInfo.customerName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 gap-0 ml-4">
              <div className="flex items-end gap-2 h-6">
                <span className="text-lg font-bold">{customerInfo.customerName}</span>
              </div>
              <div className="flex items-end gap-2 text-sm text-muted-foreground h-6">
                <span>手机：{customerInfo.customerPhone}</span>
              </div>
              <div className="flex items-end gap-2 text-sm text-muted-foreground h-6">
                <span>地址：{customerInfo.customerAddress || '暂无地址信息'}</span>
              </div>
            </div>
          </div>
          <div className="flex-[0_0_40%] border-l pl-6 pr-6 flex flex-col justify-start">
            <div className="flex items-end justify-between text-sm h-6">
              <span className="text-muted-foreground">会员等级</span>
              <span className="font-medium text-warning">{customerInfo.membershipLevel || '普通会员'}</span>
            </div>
            <div className="flex items-end justify-between text-sm h-6">
              <span className="text-muted-foreground">账户余额</span>
              <span className="font-medium text-warning">¥{customerInfo.accountBalance?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-end justify-between text-sm h-6">
              <span className="text-muted-foreground">优惠券</span>
              <span className="font-medium">{customerInfo.couponCount || 0}张</span>
            </div>
          </div>
        </div>
      </Card>
    )
  } else {
    return (
      <Card className="flex flex-col py-8 px-8 gap-4">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-sm rounded-lg shrink-0">
              <AvatarFallback className="bg-stat-1-soft text-stat-1 text-xl rounded-lg">
                {customerInfo.customerName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 gap-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold">{customerInfo.customerName}</span>
                {customerInfo.customerNumber && (
                  <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">{customerInfo.customerNumber}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>联系人：{customerInfo.contactPerson || '未知联系人'}</span>
                <span className="text-xs border-l pl-2 ml-1">{customerInfo.customerPhone || '-'}</span>
              </div>
              <div className="flex items-end gap-2 text-sm text-muted-foreground h-6">
                <span>地址：{customerInfo.customerAddress || '暂无注册地址'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col flex-1 border-l pl-6 gap-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">协议客户</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">额度:</span>
                <span className="font-medium text-primary">¥{customerInfo.creditLimit?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
            <div className="flex flex-col pt-1 gap-2">
              {customerInfo.uscc && (
                <div className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded border border-transparent hover:border-border transition-colors">
                  <span className="text-muted-foreground">统一社会信用代码</span>
                  <span className="font-medium text-xs">{customerInfo.uscc}</span>
                </div>
              )}
              {customerInfo.legalRepresentative && (
                <div className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded border border-transparent hover:border-border transition-colors">
                  <span className="text-muted-foreground">法定代表人</span>
                  <span className="font-medium">{customerInfo.legalRepresentative}</span>
                </div>
              )}
              {customerInfo.industry && (
                <div className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded border border-transparent hover:border-border transition-colors">
                  <span className="text-muted-foreground">行业</span>
                  <span className="font-medium">{customerInfo.industry}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded border border-transparent hover:border-border transition-colors">
                <span className="text-muted-foreground">月结账期</span>
                <span className="font-medium">{customerInfo.paymentTerm || '次月10日'}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }
}
