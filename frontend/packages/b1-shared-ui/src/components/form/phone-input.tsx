import * as React from "react"
import { Input } from "../ui/input"
import { cn } from "cn"

export interface CountryCode {
  code: string
  name: string
  dialCode: string
  flag?: string
}

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  countryCodes?: CountryCode[]
  defaultCountryCode?: string
  onCountryCodeChange?: (countryCode: string) => void
  disabled?: boolean
  className?: string
  inputClassName?: string
  selectClassName?: string
}

const DEFAULT_COUNTRY_CODES: CountryCode[] = [
  { code: 'CN', name: '中国', dialCode: '+86', flag: '🇨🇳' },
  { code: 'US', name: '美国', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: '英国', dialCode: '+44', flag: '🇬🇧' },
  { code: 'JP', name: '日本', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: '韩国', dialCode: '+82', flag: '🇰🇷' },
  { code: 'HK', name: '香港', dialCode: '+852', flag: '🇭🇰' },
  { code: 'TW', name: '台湾', dialCode: '+886', flag: '🇹🇼' },
  { code: 'SG', name: '新加坡', dialCode: '+65', flag: '🇸🇬' },
  { code: 'AU', name: '澳大利亚', dialCode: '+61', flag: '🇦🇺' },
  { code: 'CA', name: '加拿大', dialCode: '+1', flag: '🇨🇦' },
  { code: 'DE', name: '德国', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: '法国', dialCode: '+33', flag: '🇫🇷' },
]

/**
 * 手机号输入框
 * 支持国际区号选择
 */
const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ 
    value = '',
    onChange,
    countryCodes = DEFAULT_COUNTRY_CODES,
    defaultCountryCode = 'CN',
    onCountryCodeChange,
    disabled = false,
    className,
    inputClassName,
    selectClassName,
    ...props 
  }, ref) => {
    const [selectedCountryCode, setSelectedCountryCode] = React.useState(defaultCountryCode)
    const [phoneNumber, setPhoneNumber] = React.useState('')

    const selectedCountry = React.useMemo(() => {
      return countryCodes.find(c => c.code === selectedCountryCode) || countryCodes[0]
    }, [selectedCountryCode, countryCodes])

    React.useEffect(() => {
      const dialCode = selectedCountry.dialCode
      if (value.startsWith(dialCode)) {
        setPhoneNumber(value.slice(dialCode.length))
      } else {
        setPhoneNumber(value)
      }
    }, [value, selectedCountry])

    const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCode = e.target.value
      setSelectedCountryCode(newCode)
      onCountryCodeChange?.(newCode)
      
      const newCountry = countryCodes.find(c => c.code === newCode)
      if (newCountry) {
        onChange?.(newCountry.dialCode + phoneNumber)
      }
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value.replace(/\D/g, '')
      setPhoneNumber(newValue)
      onChange?.(selectedCountry.dialCode + newValue)
    }

    return (
      <div className={cn("flex gap-2", className)}>
        <select
          value={selectedCountryCode}
          onChange={handleCountryCodeChange}
          disabled={disabled}
          className={cn(
            "flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-w-[120px]",
            selectClassName
          )}
        >
          {countryCodes.map(country => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.dialCode}
            </option>
          ))}
        </select>

        <Input
          ref={ref}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          disabled={disabled}
          placeholder="请输入手机号"
          className={cn("flex-1", inputClassName)}
          {...props}
        />
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
