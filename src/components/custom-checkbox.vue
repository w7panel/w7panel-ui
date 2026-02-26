<template>
  <a-checkbox
    :checked="modelValue === checkedValue"
    @change="handleChange"
  >
    <slot></slot>
  </a-checkbox>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    modelValue: {
      type: [Boolean, String, Number],
      default: false
    },
    checkedValue: {
      type: [Boolean, String, Number],
      default: true
    },
    uncheckedValue: {
      type: [Boolean, String, Number],
      default: false
    }
  },
  emits: ['update:modelValue'],
  methods: {
    handleChange(checked) {
      this.$emit('update:modelValue', checked ? this.checkedValue : this.uncheckedValue);
    }
  }
});
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>    