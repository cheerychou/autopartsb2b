import { Card } from './card'
import { Avatar, AvatarFallback } from './avatar'
import { Car } from "@phosphor-icons/react";
import type { VehicleInfo } from './customer-vehicle-card.types'

export interface VehicleInfoCardProps {
  vehicleInfo: VehicleInfo
}

export function VehicleInfoCard({ vehicleInfo }: VehicleInfoCardProps) {
  return (
    <Card className="flex flex-col py-8 px-8 gap-4">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-[0_0_60%] flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-background shadow-sm shrink-0">
            <AvatarFallback className="bg-muted text-muted-foreground text-2xl rounded-full">
              <Car className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 gap-0 ml-4">
            <div className="flex items-end gap-2 h-6">
              <span className="text-lg font-bold">{vehicleInfo.licensePlate}</span>
            </div>
            <div className="flex items-end gap-2 text-sm text-muted-foreground h-6">
              <span>{`${vehicleInfo.brand} ${vehicleInfo.series || ''} ${vehicleInfo.model} ${vehicleInfo.year ? `(${vehicleInfo.year}款)` : ''}`.replace(/\s+/g, ' ').trim()}</span>
            </div>
            <div className="flex items-end gap-2 text-sm text-muted-foreground h-6">
              <span>VIN：{vehicleInfo.vin || '-'}</span>
            </div>
          </div>
        </div>
        <div className="flex-[0_0_40%] border-l pl-6 pr-6 flex flex-col justify-start">
          <div className="flex items-end justify-between text-sm h-6">
            <span className="text-muted-foreground">当前里程</span>
            <span className="font-medium">{vehicleInfo.currentMileage ? `${vehicleInfo.currentMileage.toLocaleString()} 公里` : '-'}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
