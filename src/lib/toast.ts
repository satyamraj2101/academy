import { toast } from 'sonner';

export const toastUtils = {
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },
  error: (message: string, description?: string) => {
    toast.error(message, { description });
  },
  loading: (message: string) => {
    return toast.loading(message);
  },
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string | ((data: T) => string); error: string | ((err: any) => string) }
  ) => {
    toast.promise(promise, msgs);
  },
  dismiss: (id?: string | number) => toast.dismiss(id)
};

export { toastUtils as toast };
