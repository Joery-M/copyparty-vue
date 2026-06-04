<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';

import {
    Fullscreen,
    Maximize,
    Minimize,
    PaintBucket,
    RotateCcw,
    RotateCw,
    ZoomIn,
    ZoomOut,
} from '@lucide/vue';
import {
    refDebounced,
    refWithControl,
    useElementBounding,
    useElementHover,
    useElementSize,
    useFullscreen,
    useIdle,
    useKeyModifier,
    usePreferredReducedMotion,
    useTimeoutFn,
    whenever,
} from '@vueuse/core';
import { computed, ref, useTemplateRef, watchEffect } from 'vue';

import type { File } from '@/lib/interop';

import ImagePixelated from '@/assets/image-pixelated.svg?raw';
import ImageSmooth from '@/assets/image-smooth.svg?raw';
import Tooltip from '@/components/Tooltip.vue';
import VideoControls from '@/components/viewers/VideoControls.vue';
import { getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { useShortcut } from '@/lib/keyboard.ts';
import { useSettings } from '@/stores/useSettings';

import DialogFooter from '../ui/dialog/DialogFooter.vue';

import { Button } from '@shadcn/button';
import { ButtonGroup } from '@shadcn/button-group';
import { Select, SelectContent, SelectGroup, SelectItem } from '@shadcn/select';

const props = defineProps<{ file: File }>();

const mediaUrl = getApiUrl(props.file.fullPath, { cache: '', raw: '' });

const settings = useSettings();
const preferrersReducedMotion = usePreferredReducedMotion();

const backgroundClass = computed(() => {
    if (isLoading.value) return {};
    if (fullscreenElement.isFullscreen.value) return { 'bg-black': true };

    switch (settings.preview.bgType) {
        case 'black':
            return { 'bg-black': true };
        case 'white':
            return { 'bg-white': true };
        case 'transparent':
            return { 'bg-transparent': true };
        default:
            return {};
    }
});

const backgroundTypeButton = useTemplateRef('backgroundTypeButton');
const backgroundTypeSelectOpen = ref(false);

const isLoading = ref(true);
const enableZoomToFit = ref(true);
const enableTransition = refWithControl(false, {
    onBeforeChange(value) {
        if (value && preferrersReducedMotion.value === 'reduce') return false;
    },
});
const isHoldingShift = useKeyModifier('Shift');

const controlsElem = useTemplateRef('controls');
const controlsBounds = useElementBounding(controlsElem);

const videoControlsElem = useTemplateRef<ComponentPublicInstance<typeof VideoControls> | null>(
    'videoControls'
);
const videoControlsBounds = useElementBounding(videoControlsElem);

const wrapperElem = useTemplateRef('wrapper');
const fullscreenElement = useFullscreen(wrapperElem);

const containerElem = useTemplateRef('container');
const containerSize = useElementSize(containerElem);

const mediaElem = useTemplateRef('media');
const mediaBounds = useElementBounding(mediaElem);
const mediaSize = computed<[number, number]>(() => {
    if (!mediaElem.value || isLoading.value)
        return [containerSize.width.value, containerSize.height.value];
    if (mediaElem.value instanceof HTMLImageElement) {
        return [mediaElem.value.naturalWidth, mediaElem.value.naturalHeight];
    } else if (mediaElem.value instanceof HTMLVideoElement) {
        return [mediaElem.value.videoWidth, mediaElem.value.videoHeight];
    } else {
        return [containerSize.width.value, containerSize.height.value];
    }
});

const isOverlappingControls = refDebounced(
    computed(() => mediaBounds.top.value <= controlsBounds.bottom.value),
    50
);
const isOverlappingVideoControls = refDebounced(
    computed(() => mediaBounds.bottom.value >= videoControlsBounds.top.value),
    50
);

const isIdle = useIdle(1500, {
    events: ['mousemove', 'resize', 'keydown', 'touchstart', 'wheel'],
});
const isCursorInside = useElementHover(wrapperElem, { delayLeave: 250 });
whenever(
    () => isOverlappingControls.value || isOverlappingVideoControls.value,
    () => isIdle.reset()
);

const hideControls = computed(
    () => isOverlappingControls.value && (isIdle.idle.value || !isCursorInside.value)
);
const hideVideoControls = computed(
    () =>
        !!videoControlsElem.value &&
        isOverlappingVideoControls.value &&
        (isIdle.idle.value || !isCursorInside.value)
);

const containerMiddle = computed<[number, number]>(() => [
    containerSize.width.value / 2,
    containerSize.height.value / 2,
]);

const _zoomedMediaSize = ref<[number, number]>();
const zoomedMediaSize = computed<[number, number]>({
    get: () => _zoomedMediaSize.value ?? mediaSize.value,
    set: (v) => (_zoomedMediaSize.value = v),
});
const smallestMediaAxis = computed(() =>
    Math.min(zoomedMediaSize.value[0], zoomedMediaSize.value[1])
);
const largestMediaAxis = computed(() => Math.max(mediaSize.value[0], mediaSize.value[1]));
const largestContainerAxis = computed(() =>
    Math.max(containerSize.width.value, containerSize.height.value)
);
const smallestContainerAxis = computed(() =>
    Math.min(containerSize.width.value, containerSize.height.value)
);
const largestZoomedMediaAxis = computed(() =>
    Math.max(zoomedMediaSize.value[0], zoomedMediaSize.value[1])
);
const zoomFactor = computed(() => largestZoomedMediaAxis.value / largestMediaAxis.value || 0);

// If 99.99% of the image is outside the container, it might be time to stop zooming
const zoomedMediaArea = computed(() => zoomedMediaSize.value[0] * zoomedMediaSize.value[1]);
const containerArea = computed(() => containerSize.width.value * containerSize.height.value);
const isTooLarge = computed(() => containerArea.value / zoomedMediaArea.value < 0.0001);

function zoom(ratio: number) {
    clickedZoom();
    if (ratio < 0) {
        if (smallestMediaAxis.value < 5) return;
    } else if (ratio > 0 && largestContainerAxis.value > 0 && isTooLarge.value) {
        return;
    }

    const r = 1 + ratio;
    zoomedMediaSize.value = [zoomedMediaSize.value[0] * r, zoomedMediaSize.value[1] * r];
}

/**
 * @source https://stackoverflow.com/a/14731922
 */
function calculateFitRatio(
    srcWidth: number,
    srcHeight: number,
    maxWidth: number,
    maxHeight: number,
    minWidth: number,
    minHeight: number
): [number, number] {
    const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return [
        Math.floor(Math.max(srcWidth, minWidth) * ratio),
        Math.floor(Math.max(srcHeight, minHeight) * ratio),
    ];
}

function zoomToFit() {
    const isSideways = (rotation.value / 2) % 1 != 0;
    const ratio = calculateFitRatio(
        mediaSize.value[isSideways ? 1 : 0],
        mediaSize.value[isSideways ? 0 : 1],
        containerSize.width.value,
        containerSize.height.value,
        mediaSize.value[0],
        mediaSize.value[1]
    );
    zoomedMediaSize.value = ratio;
}

// These 2 numbers work and I don't really care why
const zoomOutFactor = -0.25;
const zoomInFactor = 1 / 3;

const rotation = ref(0);

const computedStyle = computed(() => ({
    transform: `translateX(-50%) translateY(-50%) rotateZ(${rotation.value * 90}deg)`,
    left: containerMiddle.value[0] + 'px',
    top: containerMiddle.value[1] + 'px',
    width: mediaSize.value[0] * zoomFactor.value + 'px',
    height: mediaSize.value[1] * zoomFactor.value + 'px',
}));

watchEffect(() => {
    if (
        enableZoomToFit.value &&
        smallestContainerAxis.value !== 0 &&
        largestZoomedMediaAxis.value !== 0
    )
        zoomToFit();
});

function clickedZoom() {
    enableTransition.value = true;
    enableZoomToFit.value = false;
}
function clickedRotation() {
    enableTransition.value = true;
}

const disableTransition$ = useTimeoutFn(() => (enableTransition.value = false), 100, {
    immediate: false,
});
const disableTransition = disableTransition$.start;

// Zoom in
useShortcut(
    (e) => e.key === '+' || e.code === 'Equal',
    (e) => (e.preventDefault(), zoom(zoomInFactor))
);
// Zoom out
useShortcut(
    (e) => e.key === '-' || e.code === 'Minus',
    (e) => (e.preventDefault(), zoom(zoomOutFactor))
);
// Rotate CW/CCW
useShortcut(
    ['r', 'R'],
    (e) => ((enableTransition.value = true), (rotation.value += e.shiftKey ? -1 : 1))
);
useShortcut(['f'], () => fullscreenElement.toggle());
useShortcut(['p'], () => (settings.preview.pixelated = !settings.preview.pixelated));
useShortcut(['b'], () => (backgroundTypeSelectOpen.value = true));
// Zoom to perc/fit
useShortcut(
    (e) => !Number.isNaN(parseInt(e.key)),
    (e) => {
        const num = parseInt(e.key);
        enableTransition.value = true;
        // If 0, zoom to fit
        if (!num) {
            enableZoomToFit.value = true;
        } else {
            enableZoomToFit.value = false;
            zoomedMediaSize.value = [mediaSize.value[0] * num, mediaSize.value[1] * num];
        }
    }
);

function isVideo(elem: any): elem is HTMLVideoElement {
    return (
        props.file.classification === FileClassification.Video && elem instanceof HTMLVideoElement
    );
}
</script>

<template>
    <div
        class="wrapper"
        ref="wrapper"
        :class="{ isFullScreen: fullscreenElement.isFullscreen.value }"
    >
        <div class="container" ref="container">
            <div
                v-if="settings.preview.bgType === 'grid' && !isLoading"
                class="background-grid"
                :class="{ 'transition-all': enableTransition }"
                :style="computedStyle"
            />
            <img
                ref="media"
                v-if="
                    file.classification === FileClassification.RasterImage ||
                    file.classification === FileClassification.VectorImage
                "
                class="media"
                :style="{
                    ...computedStyle,
                    cursor: isHoldingShift ? 'zoom-out' : 'zoom-in',
                    imageRendering: settings.preview.pixelated ? 'pixelated' : 'smooth',
                }"
                :class="{ ...backgroundClass, 'transition-all': enableTransition }"
                :src="mediaUrl"
                :alt="file.name"
                @transitionend="disableTransition()"
                @load="isLoading = false"
                @click="zoom(isHoldingShift ? zoomOutFactor : zoomInFactor)"
            />
            <video
                ref="media"
                v-else-if="file.classification === FileClassification.Video"
                class="media"
                :class="{
                    ...backgroundClass,
                    'transition-all': enableTransition,
                    'cursor-none': isIdle.idle.value,
                }"
                :style="computedStyle"
                :src="mediaUrl"
                :alt="file.name"
                @transitionend="disableTransition()"
                @loadedmetadata="isLoading = false"
                @loadeddata="isLoading = false"
                @dblclick="fullscreenElement.toggle()"
                autoplay
                playsinline
            />
        </div>
        <VideoControls
            ref="videoControls"
            v-if="isVideo(mediaElem)"
            :video="mediaElem"
            :class="{ hide: hideVideoControls, overlap: isOverlappingVideoControls }"
            :file
        />
        <DialogFooter
            ref="controls"
            :class="{ hide: hideControls, overlap: isOverlappingControls }"
            class="flex-row sm:flex-row flex-wrap sm:justify-center max-w-full"
        >
            <ButtonGroup>
                <Tooltip :content="$t('viewer.media.background') + ' (B)'">
                    <Button
                        @click="
                            clickedZoom();
                            backgroundTypeSelectOpen = true;
                        "
                        variant="accent"
                        ref="backgroundTypeButton"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.background')"
                    >
                        <PaintBucket />
                    </Button>
                </Tooltip>
                <Tooltip
                    v-if="
                        file.classification === FileClassification.RasterImage ||
                        file.classification === FileClassification.VectorImage
                    "
                    :content="$t('viewer.media.smoothing')"
                >
                    <Button
                        @click="settings.preview.pixelated = !settings.preview.pixelated"
                        variant="accent"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.smoothing')"
                        v-html="settings.preview.pixelated ? ImagePixelated : ImageSmooth"
                    >
                    </Button>
                </Tooltip>
                <Tooltip
                    :content="
                        fullscreenElement.isFullscreen.value
                            ? $t('viewer.media.fullscreen_exit')
                            : $t('viewer.media.fullscreen_enter')
                    "
                >
                    <Button
                        @click="fullscreenElement.toggle()"
                        variant="accent"
                        size="icon-lg"
                        :aria-label="
                            fullscreenElement.isFullscreen.value
                                ? $t('viewer.media.fullscreen_exit')
                                : $t('viewer.media.fullscreen_enter')
                        "
                    >
                        <Minimize v-if="fullscreenElement.isFullscreen.value" />
                        <Maximize v-else />
                    </Button>
                </Tooltip>
            </ButtonGroup>
            <ButtonGroup>
                <Tooltip :content="$t('viewer.media.zoom.in') + ' (+)'">
                    <Button
                        @click="
                            clickedZoom();
                            zoom(zoomInFactor);
                        "
                        variant="accent"
                        size="icon-lg"
                        shortcut="+"
                        :aria-label="$t('viewer.media.zoom.in')"
                        :disabled="isTooLarge"
                    >
                        <ZoomIn />
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.zoom.to', { perc: 100 }) + ' (1)'">
                    <Button
                        @click="
                            clickedZoom();
                            zoomedMediaSize = mediaSize;
                        "
                        variant="accent"
                        size="lg"
                        class="text-base"
                        shortcut="1"
                        :aria-label="$t('viewer.media.zoom.to', { perc: 100 })"
                    >
                        {{
                            enableZoomToFit
                                ? $t('viewer.media.zoom.fit_perc')
                                : $n(zoomFactor, { style: 'percent' })
                        }}
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.zoom.fit') + ' (0)'">
                    <Button
                        @click="
                            enableTransition = true;
                            enableZoomToFit = true;
                        "
                        variant="accent"
                        size="icon-lg"
                        shortcut="0"
                        :aria-label="$t('viewer.media.zoom.fit')"
                    >
                        <Fullscreen />
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.zoom.out') + ' (-)'">
                    <Button
                        @click="
                            clickedZoom();
                            zoom(zoomOutFactor);
                        "
                        :disabled="smallestMediaAxis < 5"
                        variant="accent"
                        size="icon-lg"
                        aria-keyshortcuts="-"
                        :aria-label="$t('viewer.media.zoom.out')"
                    >
                        <ZoomOut />
                    </Button>
                </Tooltip>
            </ButtonGroup>
            <ButtonGroup>
                <Tooltip :content="$t('viewer.media.rotate_ccw') + ' (Shift + R)'">
                    <Button
                        @click="
                            clickedRotation();
                            rotation--;
                        "
                        variant="accent"
                        size="icon-lg"
                        shortcut="Shift+R"
                        :aria-label="$t('viewer.media.rotate_ccw')"
                    >
                        <RotateCcw />
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.rotate_cw') + ' (R)'">
                    <Button
                        @click="
                            clickedRotation();
                            rotation++;
                        "
                        variant="accent"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.rotate_cw')"
                    >
                        <RotateCw />
                    </Button>
                </Tooltip>
            </ButtonGroup>
        </DialogFooter>
        <!-- Background color select -->
        <Select v-model="settings.preview.bgType" v-model:open="backgroundTypeSelectOpen">
            <SelectContent position="popper" :reference="backgroundTypeButton?.$el">
                <SelectGroup>
                    <SelectItem value="transparent"> Transparent </SelectItem>
                    <SelectItem value="black"> Black </SelectItem>
                    <SelectItem value="white"> White </SelectItem>
                    <SelectItem value="grid"> Grid </SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    </div>
</template>

<style scoped>
@reference "@/style.css";

.wrapper {
    @apply flex flex-col size-full pointer-events-none gap-5;
    --viewer-margin-top: calc(var(--spacing) * 12 + env(safe-area-inset-top));
    --viewer-margin-bottom: calc(var(--spacing) * 12 + env(safe-area-inset-bottom));

    &.isFullScreen {
        @apply pointer-events-auto;
    }
}

[data-slot='dialog-footer'] > * {
    --spacing: 0.3rem;
}

@media (height < 20rem) {
    .wrapper {
        --viewer-margin-top: calc(calc(var(--spacing) * 9) + env(safe-area-inset-top));
        --viewer-margin-bottom: calc(calc(var(--spacing) * 9) + env(safe-area-inset-bottom));
    }
    [data-slot='dialog-footer'] > * {
        --spacing: 0.25rem;
    }
}

.container {
    @apply self-center justify-self-center h-0 min-w-full flex-1 relative;
    margin-top: var(--viewer-margin-top);
    margin-bottom: var(--viewer-margin-bottom);

    .background-grid {
        position: absolute;
        background-image: url('@/assets/transparency.png');
        background-size: 10px 10px;
        image-rendering: crisp-edges;
    }

    /* Pass through to background and close dialog */
    pointer-events: none !important;
    .media {
        pointer-events: auto;
        position: absolute;
        max-width: none;
        max-height: none;

        will-change: transform, top, left;
    }
}
.wrapper.isFullScreen .container {
    @apply m-0;
}

[data-slot='dialog-footer'] {
    @apply absolute left-5 right-5 sm:justify-center pointer-events-none! *:pointer-events-auto z-10 h-8 opacity-100;
    top: calc(var(--viewer-margin-top) - calc(var(--spacing) * 8));

    > [data-slot='button-group'] {
        @apply transition-[opacity,filter] opacity-100;
    }

    &.hide > [data-slot='button-group'] {
        @apply opacity-0;
    }

    &.overlap > [data-slot='button-group'] {
        filter: drop-shadow(0 4px 9px rgb(0 0 0 / 0.6));
    }
}
.vid-controls {
    @apply opacity-100 transition-[opacity,box-shadow];
    &.hide {
        @apply opacity-0;
    }
    &.overlap {
        box-shadow: 0 4px 9px rgb(0 0 0 / 0.6);
    }
}
</style>
