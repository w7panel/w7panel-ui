import 'vue';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $popupContainer: string;
  }
}
