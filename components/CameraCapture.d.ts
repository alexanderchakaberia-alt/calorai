declare module "@/components/CameraCapture" {
  interface CameraCaptureProps {
    onMealLogged?: () => void;
  }
  export default function CameraCapture(props: CameraCaptureProps): JSX.Element;
}
