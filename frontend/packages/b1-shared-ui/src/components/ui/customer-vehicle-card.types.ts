export interface CustomerInfo {
  customerType: 'individual' | 'corporate'
  customerId: string
  customerName: string
  customerPhone: string
  customerAddress: string
}

export interface IndividualCustomerInfo extends CustomerInfo {
  customerType: 'individual'
  membershipLevel?: string
  accountBalance?: number
  couponCount?: number
}

export interface CorporateCustomerInfo extends CustomerInfo {
  customerType: 'corporate'
  contactPerson?: string
  creditLimit?: number
  paymentTerm?: string
  customerNumber?: string
  uscc?: string
  legalRepresentative?: string
  industry?: string
}

export type CustomerInfoData = IndividualCustomerInfo | CorporateCustomerInfo

export interface VehicleInfo {
  vehicleId: string
  licensePlate: string
  brand: string
  series?: string
  model: string
  year?: string
  vin: string
  currentMileage?: number
}
