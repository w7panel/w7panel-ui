import 'vue';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $popupContainer: string;
    $confirm: (content: string, title?: string, options?: Record<string, any>) => Promise<void>;
  }
}
