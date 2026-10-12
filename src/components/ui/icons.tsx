import { forwardRef, type ComponentType, type Ref, type SVGAttributes } from 'react'
import {
  Activity as IxActivity,
  Add as IxAdd,
  Apple as IxApple,
  ArrowDown2 as IxArrowDown2,
  ArrowLeft as IxArrowLeft,
  ArrowRight as IxArrowRight,
  BatteryFull as IxBatteryFull,
  BoxTick as IxBoxTick,
  Briefcase as IxBriefcase,
  Building as IxBuilding,
  Calendar1 as IxCalendar1,
  CalendarTick as IxCalendarTick,
  CallSlash as IxCallSlash,
  ClipboardText as IxClipboardText,
  Clock as IxClock,
  CloseCircle as IxCloseCircle,
  CloudCross as IxCloudCross,
  Data as IxData,
  DocumentText as IxDocumentText,
  DocumentUpload as IxDocumentUpload,
  Drop as IxDrop,
  Edit2 as IxEdit2,
  Flash as IxFlash,
  Glass as IxGlass,
  Gps as IxGps,
  Happyemoji as IxHappyemoji,
  Health as IxHealth,
  Heart as IxHeart,
  InfoCircle as IxInfoCircle,
  Location as IxLocation,
  Lock1 as IxLock1,
  Logout as IxLogout,
  Map1 as IxMap1,
  Message as IxMessage,
  Microphone2 as IxMicrophone2,
  MicrophoneSlash as IxMicrophoneSlash,
  Note1 as IxNote1,
  Notification as IxNotification,
  NotificationBing as IxNotificationBing,
  Paperclip2 as IxPaperclip2,
  Play as IxPlay,
  Radar as IxRadar,
  ReceiptItem as IxReceiptItem,
  Refresh2 as IxRefresh2,
  RotateLeft as IxRotateLeft,
  Ruler as IxRuler,
  Scan as IxScan,
  SearchNormal1 as IxSearchNormal1,
  Send2 as IxSend2,
  ShieldCross as IxShieldCross,
  ShieldSlash as IxShieldSlash,
  ShieldTick as IxShieldTick,
  Stop as IxStop,
  Sun1 as IxSun1,
  TickCircle as IxTickCircle,
  Timer1 as IxTimer1,
  Translate as IxTranslate,
  Trash as IxTrash,
  User as IxUser,
  Video as IxVideo,
  VideoSlash as IxVideoSlash,
  VolumeCross as IxVolumeCross,
  VolumeHigh as IxVolumeHigh,
  Warning2 as IxWarning2,
  Weight as IxWeight,
  Wifi as IxWifi,
  WifiSquare as IxWifiSquare,
} from 'iconsax-react'

/**
 * Icon set shared with the patient app (Iconsax, linear style).
 * Exported under the names the screens already use, so swapping the icon
 * provider only touches this file. React 19 ignores the library's
 * defaultProps, hence the explicit size / colour / variant.
 */

type IconsaxProps = SVGAttributes<SVGElement> & { variant?: string; color?: string; size?: string | number; ref?: Ref<SVGSVGElement> }

export type IconProps = SVGAttributes<SVGElement> & { size?: string | number }
export type AppIcon = ComponentType<IconProps>
/** Kept for screens typed against the previous icon library. */
export type LucideIcon = AppIcon

function linear(Source: ComponentType<IconsaxProps>, name: string): AppIcon {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon({ size = 24, ...rest }, ref) {
    return <Source ref={ref} variant="Linear" color="currentColor" size={size} aria-hidden {...rest} />
  })
  Icon.displayName = name
  return Icon
}

export const Activity = linear(IxActivity as ComponentType<IconsaxProps>, 'Activity')
export const Apple = linear(IxApple as ComponentType<IconsaxProps>, 'Apple')
export const ArrowLeft = linear(IxArrowLeft as ComponentType<IconsaxProps>, 'ArrowLeft')
export const ArrowRight = linear(IxArrowRight as ComponentType<IconsaxProps>, 'ArrowRight')
export const Baby = linear(IxHappyemoji as ComponentType<IconsaxProps>, 'Baby')
export const BatteryMedium = linear(IxBatteryFull as ComponentType<IconsaxProps>, 'BatteryMedium')
export const Bell = linear(IxNotification as ComponentType<IconsaxProps>, 'Bell')
export const BellRing = linear(IxNotificationBing as ComponentType<IconsaxProps>, 'BellRing')
export const Briefcase = linear(IxBriefcase as ComponentType<IconsaxProps>, 'Briefcase')
export const Building2 = linear(IxBuilding as ComponentType<IconsaxProps>, 'Building2')
export const CalendarClock = linear(IxCalendarTick as ComponentType<IconsaxProps>, 'CalendarClock')
export const CalendarDays = linear(IxCalendar1 as ComponentType<IconsaxProps>, 'CalendarDays')
export const ChevronDown = linear(IxArrowDown2 as ComponentType<IconsaxProps>, 'ChevronDown')
export const CircleAlert = linear(IxInfoCircle as ComponentType<IconsaxProps>, 'CircleAlert')
export const CircleCheck = linear(IxTickCircle as ComponentType<IconsaxProps>, 'CircleCheck')
export const CheckCircle2 = CircleCheck
export const ClipboardList = linear(IxClipboardText as ComponentType<IconsaxProps>, 'ClipboardList')
export const Clock3 = linear(IxClock as ComponentType<IconsaxProps>, 'Clock3')
export const CloudOff = linear(IxCloudCross as ComponentType<IconsaxProps>, 'CloudOff')
export const CloudUpload = linear(IxDocumentUpload as ComponentType<IconsaxProps>, 'CloudUpload')
export const Database = linear(IxData as ComponentType<IconsaxProps>, 'Database')
export const Droplet = linear(IxDrop as ComponentType<IconsaxProps>, 'Droplet')
export const FileText = linear(IxDocumentText as ComponentType<IconsaxProps>, 'FileText')
export const FlaskConical = linear(IxGlass as ComponentType<IconsaxProps>, 'FlaskConical')
export const HeartPulse = linear(IxHeart as ComponentType<IconsaxProps>, 'HeartPulse')
export const Info = linear(IxInfoCircle as ComponentType<IconsaxProps>, 'Info')
export const Languages = linear(IxTranslate as ComponentType<IconsaxProps>, 'Languages')
export const LoaderCircle = linear(IxRefresh2 as ComponentType<IconsaxProps>, 'LoaderCircle')
export const LockKeyhole = linear(IxLock1 as ComponentType<IconsaxProps>, 'LockKeyhole')
export const LogOut = linear(IxLogout as ComponentType<IconsaxProps>, 'LogOut')
export const MapPin = linear(IxLocation as ComponentType<IconsaxProps>, 'MapPin')
export const Map = linear(IxMap1 as ComponentType<IconsaxProps>, 'Map')
export const Megaphone = linear(IxVolumeHigh as ComponentType<IconsaxProps>, 'Megaphone')
export const MessageSquare = linear(IxMessage as ComponentType<IconsaxProps>, 'MessageSquare')
export const Mic = linear(IxMicrophone2 as ComponentType<IconsaxProps>, 'Mic')
export const MicOff = linear(IxMicrophoneSlash as ComponentType<IconsaxProps>, 'MicOff')
export const NotebookPen = linear(IxNote1 as ComponentType<IconsaxProps>, 'NotebookPen')
export const PackageCheck = linear(IxBoxTick as ComponentType<IconsaxProps>, 'PackageCheck')
export const Paperclip = linear(IxPaperclip2 as ComponentType<IconsaxProps>, 'Paperclip')
export const PencilLine = linear(IxEdit2 as ComponentType<IconsaxProps>, 'PencilLine')
export const PhoneOff = linear(IxCallSlash as ComponentType<IconsaxProps>, 'PhoneOff')
export const Pill = linear(IxReceiptItem as ComponentType<IconsaxProps>, 'Pill')
export const Play = linear(IxPlay as ComponentType<IconsaxProps>, 'Play')
export const Plug = linear(IxFlash as ComponentType<IconsaxProps>, 'Plug')
export const Plus = linear(IxAdd as ComponentType<IconsaxProps>, 'Plus')
export const Radio = linear(IxRadar as ComponentType<IconsaxProps>, 'Radio')
export const RadioTower = Radio
export const RotateCcw = linear(IxRotateLeft as ComponentType<IconsaxProps>, 'RotateCcw')
export const Ruler = linear(IxRuler as ComponentType<IconsaxProps>, 'Ruler')
export const ScanEye = linear(IxScan as ComponentType<IconsaxProps>, 'ScanEye')
export const Search = linear(IxSearchNormal1 as ComponentType<IconsaxProps>, 'Search')
export const Send = linear(IxSend2 as ComponentType<IconsaxProps>, 'Send')
export const ShieldAlert = linear(IxShieldCross as ComponentType<IconsaxProps>, 'ShieldAlert')
export const ShieldCheck = linear(IxShieldTick as ComponentType<IconsaxProps>, 'ShieldCheck')
export const ShieldX = linear(IxShieldSlash as ComponentType<IconsaxProps>, 'ShieldX')
export const Square = linear(IxStop as ComponentType<IconsaxProps>, 'Square')
export const Stethoscope = linear(IxHealth as ComponentType<IconsaxProps>, 'Stethoscope')
export const Syringe = linear(IxHealth as ComponentType<IconsaxProps>, 'Syringe')
export const Target = linear(IxGps as ComponentType<IconsaxProps>, 'Target')
export const Thermometer = linear(IxSun1 as ComponentType<IconsaxProps>, 'Thermometer')
export const Timer = linear(IxTimer1 as ComponentType<IconsaxProps>, 'Timer')
export const Trash = linear(IxTrash as ComponentType<IconsaxProps>, 'Trash')
export const TriangleAlert = linear(IxWarning2 as ComponentType<IconsaxProps>, 'TriangleAlert')
export const UserRound = linear(IxUser as ComponentType<IconsaxProps>, 'UserRound')
export const Video = linear(IxVideo as ComponentType<IconsaxProps>, 'Video')
export const VideoOff = linear(IxVideoSlash as ComponentType<IconsaxProps>, 'VideoOff')
export const Volume2 = linear(IxVolumeHigh as ComponentType<IconsaxProps>, 'Volume2')
export const VolumeX = linear(IxVolumeCross as ComponentType<IconsaxProps>, 'VolumeX')
export const Weight = linear(IxWeight as ComponentType<IconsaxProps>, 'Weight')
export const Wifi = linear(IxWifi as ComponentType<IconsaxProps>, 'Wifi')
export const WifiOff = linear(IxWifiSquare as ComponentType<IconsaxProps>, 'WifiOff')
export const X = linear(IxCloseCircle as ComponentType<IconsaxProps>, 'X')
