<template>
  <div class="relative" ref="comboboxRef">
    <!-- 输入框 -->
    <div class="relative flex items-center" ref="triggerRef">
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        :placeholder="placeholder"
        class="flex-1 px-2 py-1 pr-8 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-400 transition-all min-w-0"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        @input="handleInput"
      />
      <!-- 下拉箭头 -->
      <button
        type="button"
        class="absolute right-1 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        @mousedown.prevent="toggleDropdown"
        tabindex="-1"
      >
        <Icon :name="isOpen ? 'chevron-up' : 'chevron-down'" size="xs" />
      </button>
    </div>

    <!-- 下拉选项列表 - 使用 Teleport 和 fixed 定位 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-show="isOpen && filteredOptions.length > 0"
          ref="dropdownRef"
          :style="dropdownStyle"
          class="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          <div
            v-for="(option, index) in filteredOptions"
            :key="option.value"
            :class="[
              'px-3 py-2 text-xs cursor-pointer transition-colors',
              index === highlightedIndex
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-50',
            ]"
            @mousedown.prevent="selectOption(option)"
            @mouseenter="highlightedIndex = index"
          >
            <div class="font-medium">{{ option.label }}</div>
            <div v-if="option.value" class="text-gray-500 mt-0.5 truncate">
              {{ option.value }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import Icon from "./Icon.vue";

interface Option {
  label: string;
  value: string;
}

interface Props {
  modelValue: string;
  options: Option[];
  placeholder?: string;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "",
});

const emit = defineEmits<Emits>();

const comboboxRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const inputValue = ref(props.modelValue);
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const dropdownStyle = ref<Record<string, string>>({});

// 节流标记
let updateTimer: number | null = null;

// 更新下拉框位置
function updateDropdownPosition() {
  if (!triggerRef.value || !isOpen.value) {
    dropdownStyle.value = {};
    return;
  }

  const rect = triggerRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const dropdownMaxHeight = 240; // max-h-60 = 15rem = 240px

  // 计算下方空间是否足够
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  // 判断应该向上还是向下展开
  const shouldOpenUpward =
    spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow;

  if (shouldOpenUpward) {
    // 向上展开
    dropdownStyle.value = {
      bottom: `${viewportHeight - rect.top + 4}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    };
  } else {
    // 向下展开
    dropdownStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    };
  }
}

// 标记是否正在输入（用于区分聚焦和真正的输入）
const isTyping = ref(false);

// 过滤选项
const filteredOptions = computed(() => {
  // 如果刚打开且没有输入，显示所有选项
  if (!isTyping.value) {
    return props.options;
  }

  // 如果输入为空，显示所有选项
  if (!inputValue.value) {
    return props.options;
  }

  // 过滤选项
  const searchTerm = inputValue.value.toLowerCase();
  return props.options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchTerm) ||
      option.value.toLowerCase().includes(searchTerm)
  );
});

// 监听 isOpen 变化，更新位置
watch(isOpen, (newValue) => {
  if (newValue) {
    // 使用 requestAnimationFrame 确保 DOM 更新后再计算位置
    requestAnimationFrame(() => {
      updateDropdownPosition();
    });
  }
});

// 监听外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    inputValue.value = newValue;
  }
);

// 监听输入值变化，向外部发送
watch(inputValue, (newValue) => {
  emit("update:modelValue", newValue);
});

function handleFocus() {
  isOpen.value = true;
  isTyping.value = false; // 聚焦时重置输入状态，显示所有选项
  highlightedIndex.value = -1;
}

function handleBlur() {
  // 延迟关闭，以便点击选项时能触发
  setTimeout(() => {
    isOpen.value = false;
    isTyping.value = false;
  }, 200);
}

function handleInput() {
  isOpen.value = true;
  isTyping.value = true; // 用户开始输入
  highlightedIndex.value = -1;
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    isTyping.value = false; // 切换打开时显示所有选项
    inputRef.value?.focus();
  }
}

function selectOption(option: Option) {
  inputValue.value = option.value;
  isOpen.value = false;
  isTyping.value = false;
  inputRef.value?.blur();
}

function handleKeydown(event: KeyboardEvent) {
  if (!isOpen.value && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
    isOpen.value = true;
    isTyping.value = false; // 键盘打开时显示所有选项
    event.preventDefault();
    return;
  }

  if (!isOpen.value) return;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      if (highlightedIndex.value < filteredOptions.value.length - 1) {
        highlightedIndex.value++;
        scrollToHighlighted();
      }
      break;

    case "ArrowUp":
      event.preventDefault();
      if (highlightedIndex.value > 0) {
        highlightedIndex.value--;
        scrollToHighlighted();
      }
      break;

    case "Enter":
      event.preventDefault();
      if (
        highlightedIndex.value >= 0 &&
        highlightedIndex.value < filteredOptions.value.length
      ) {
        selectOption(filteredOptions.value[highlightedIndex.value]);
      }
      break;

    case "Escape":
      event.preventDefault();
      isOpen.value = false;
      inputRef.value?.blur();
      break;
  }
}

function scrollToHighlighted() {
  // 滚动到高亮项
  const dropdown = dropdownRef.value;
  if (!dropdown) return;

  const highlightedElement = dropdown.children[
    highlightedIndex.value
  ] as HTMLElement;

  if (highlightedElement) {
    const dropdownRect = dropdown.getBoundingClientRect();
    const elementRect = highlightedElement.getBoundingClientRect();

    if (elementRect.bottom > dropdownRect.bottom) {
      highlightedElement.scrollIntoView({ block: "nearest" });
    } else if (elementRect.top < dropdownRect.top) {
      highlightedElement.scrollIntoView({ block: "nearest" });
    }
  }
}

// 点击外部关闭下拉框
function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  const isClickInside = comboboxRef.value?.contains(target);
  const isClickInDropdown = dropdownRef.value?.contains(target);

  if (!isClickInside && !isClickInDropdown) {
    isOpen.value = false;
  }
}

// 节流更新位置（用于滚动和resize）
function throttledUpdatePosition() {
  if (!isOpen.value) return;

  if (updateTimer) {
    return;
  }

  updateTimer = window.requestAnimationFrame(() => {
    updateDropdownPosition();
    updateTimer = null;
  });
}

// 监听滚动事件，更新下拉框位置
function handleScroll() {
  throttledUpdatePosition();
}

// 监听窗口大小改变，更新下拉框位置
function handleResize() {
  throttledUpdatePosition();
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  window.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  window.removeEventListener("scroll", handleScroll, true);
  window.removeEventListener("resize", handleResize);

  // 清理定时器
  if (updateTimer) {
    cancelAnimationFrame(updateTimer);
  }
});
</script>
