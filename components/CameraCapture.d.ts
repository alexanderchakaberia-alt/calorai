declare module "@/components/CameraCapture" {
  interface CameraCaptureProps {
    onMealLogged?: () => void;
    /** YYYY-MM-DD — must match tracker date when logging */
    logDate?: string;
    calorieGoal?: number;
    /** Sum of calories already logged for `logDate` (before this meal) */
    dayCaloriesBeforeMeal?: number;
  }
  export default function CameraCapture(props: CameraCaptureProps): JSX.Element;
}
