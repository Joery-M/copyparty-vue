<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import type { File } from '@/lib/interop';
import { Fullscreen, PaintBucket, ZoomIn, ZoomOut } from 'lucide-vue-next';
import DialogFooter from '../ui/dialog/DialogFooter.vue';

import { Button } from '@shadcn/button';
import { ButtonGroup } from '@shadcn/button-group';
import { Select, SelectContent, SelectGroup, SelectItem } from '@shadcn/select';
import {
    until,
    useElementSize,
    useFullscreen,
    useKeyModifier,
    useLocalStorage
} from '@vueuse/core';
import { computed, nextTick, ref, useTemplateRef } from 'vue';

const props = defineProps<{ file: File }>();

const mediaUrl = getApiUrl(props.file.fullPath);

enum BackgroundType {
    Transparent = 'transparent',
    Black = 'black',
    White = 'white',
    Grid = 'grid'
}
const backgroundType = useLocalStorage<BackgroundType>(
    'preview-background-type',
    BackgroundType.Transparent
);

const backgroundClass = computed(() => {
    if (isLoading.value) return [];
    if (fullscreenElement.isFullscreen.value) return { 'bg-black': true };

    switch (backgroundType.value) {
        case BackgroundType.Black:
            return { 'bg-black': true };
        case BackgroundType.White:
            return { 'bg-white': true };
        case BackgroundType.Transparent:
            return { 'bg-transparent': true };
        case BackgroundType.Grid:
            return { 'background-grid': true };
    }
});

const backgroundTypeButton = useTemplateRef('backgroundTypeButton');
const backgroundTypeSelectOpen = ref(false);

const isLoading = ref(true);
const isDoneZooming = ref(false);
const isHoldingShift = useKeyModifier('Shift');

const containerElem = useTemplateRef('container');
const containerSize = useElementSize(containerElem);

const mediaElem = useTemplateRef('media');
const fullscreenElement = useFullscreen(mediaElem);
const mediaSize = computed<[number, number]>(() => {
    if (!mediaElem.value || isLoading.value) return [0, 0];
    if (mediaElem.value instanceof HTMLImageElement) {
        return [mediaElem.value.naturalWidth, mediaElem.value.naturalHeight];
    } else if (mediaElem.value instanceof HTMLVideoElement) {
        return [mediaElem.value.videoWidth, mediaElem.value.videoHeight];
    } else {
        return [0, 0];
    }
});

const containerMiddle = computed<[number, number]>(() => [
    containerSize.width.value / 2,
    containerSize.height.value / 2
]);
const mediaMiddleInContainer = computed<[number, number]>(() => [
    containerMiddle.value[0] - mediaSize.value[0] / 2,
    containerMiddle.value[1] - mediaSize.value[1] / 2
]);

const _zoomedMediaSize = ref<[number, number]>();
const zoomedMediaSize = computed<[number, number]>({
    get: () => _zoomedMediaSize.value ?? mediaSize.value,
    set: (v) => (_zoomedMediaSize.value = v)
});
const smallestMediaAxis = computed(() =>
    Math.min(zoomedMediaSize.value[0], zoomedMediaSize.value[1])
);
const largestMediaAxis = computed(() => Math.max(mediaSize.value[0], mediaSize.value[1]));
const largestContainerAxis = computed(() =>
    Math.max(containerSize.width.value, containerSize.height.value)
);
const largestZoomedMediaAxis = computed(() =>
    Math.max(zoomedMediaSize.value[0], zoomedMediaSize.value[1])
);
const zoomFactor = computed(() => largestZoomedMediaAxis.value / largestMediaAxis.value || 0);

function zoom(ratio: number) {
    if (ratio < 0) {
        if (smallestMediaAxis.value < 5) return;
    } else if (ratio > 0 && containerSize.width.value > 0) {
        if (largestMediaAxis.value > containerSize.width.value * 4) return;
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
    maxHeight: number
): [number, number] {
    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return [Math.floor(srcWidth * ratio), Math.floor(srcHeight * ratio)];
}

function zoomToFit() {
    const ratio = calculateFitRatio(
        mediaSize.value[0],
        mediaSize.value[1],
        containerSize.width.value,
        containerSize.height.value
    );
    zoomedMediaSize.value = ratio;
}

async function loaded() {
    isLoading.value = false;
    await Promise.all([
        until(largestContainerAxis).not.toBe(0),
        until(largestZoomedMediaAxis).not.toBe(0)
    ]);
    // If it's larger than the container on load, resize it
    if (largestZoomedMediaAxis.value > largestContainerAxis.value) zoomToFit();
    // Not the best, but it prevents jumping at the start
    requestIdleCallback(() => {
        isDoneZooming.value = true;
    });
}

// These 2 numbers work and I don't really care why
const zoomOutFactor = -0.25;
const zoomInFactor = 1 / 3;
</script>

<template>
    <div
        class="container self-center justify-self-center h-0 min-w-full flex-1 flex m-10"
        ref="container"
    >
        <img
            ref="media"
            v-if="
                file.classification === FileClassification.RasterImage ||
                file.classification === FileClassification.VectorImage
            "
            class="media"
            :style="{
                transform: `scale(${zoomFactor})`,
                left: mediaMiddleInContainer[0] + 'px',
                top: mediaMiddleInContainer[1] + 'px',
                width: mediaSize[0] + 'px',
                height: mediaSize[1] + 'px',
                cursor: isHoldingShift ? 'zoom-out' : 'zoom-in'
            }"
            :class="{ ...backgroundClass, 'transition-all': isDoneZooming }"
            :src="mediaUrl"
            :alt="file.name"
            @load="loaded()"
            @click="zoom(isHoldingShift ? zoomOutFactor : zoomInFactor)"
        />
        <video
            ref="media"
            v-else-if="file.classification === FileClassification.Video"
            class="media"
            :class="{ ...backgroundClass, 'transition-all': isDoneZooming }"
            :style="{
                transform: `scale(${zoomFactor})`,
                left: mediaMiddleInContainer[0] + 'px',
                top: mediaMiddleInContainer[1] + 'px',
                width: mediaSize[0] + 'px',
                height: mediaSize[1] + 'px'
            }"
            :src="mediaUrl"
            :alt="file.name"
            @loadeddata="loaded()"
            controls
            autoplay
        />
    </div>
    <DialogFooter class="sm:justify-center pointer-events-none! *:pointer-events-auto z-10">
        <ButtonGroup>
            <ButtonGroup>
                <Button
                    @click="backgroundTypeSelectOpen = true"
                    variant="accent"
                    ref="backgroundTypeButton"
                    size="icon-lg"
                    aria-label="Background"
                >
                    <PaintBucket />
                </Button>
            </ButtonGroup>
            <ButtonGroup>
                <Button
                    @click="zoom(zoomInFactor)"
                    variant="accent"
                    size="icon-lg"
                    aria-label="Zoom in"
                >
                    <ZoomIn />
                </Button>
                <Button
                    @click="zoomedMediaSize = mediaSize"
                    variant="accent"
                    size="lg"
                    aria-label="Reset zoom"
                >
                    {{ zoomFactor.toLocaleString([], { style: 'percent' }) }}
                </Button>
                <Button
                    @click="zoomToFit()"
                    variant="accent"
                    size="icon-lg"
                    aria-label="Zoom to fit"
                >
                    <Fullscreen />
                </Button>
                <Button
                    @click="zoom(zoomOutFactor)"
                    :disabled="smallestMediaAxis < 5"
                    variant="accent"
                    size="icon-lg"
                    aria-label="Zoom out"
                >
                    <ZoomOut />
                </Button>
            </ButtonGroup>
        </ButtonGroup>
    </DialogFooter>

    <!-- Background color select -->
    <Select v-model="backgroundType" v-model:open="backgroundTypeSelectOpen">
        <SelectContent position="popper" :reference="backgroundTypeButton?.$el">
            <SelectGroup>
                <SelectItem :value="BackgroundType.Transparent"> Transparent </SelectItem>
                <SelectItem :value="BackgroundType.Black"> Black </SelectItem>
                <SelectItem :value="BackgroundType.White"> White </SelectItem>
                <SelectItem :value="BackgroundType.Grid"> Grid </SelectItem>
            </SelectGroup>
        </SelectContent>
    </Select>
</template>

<style lang="scss" scoped>
.background-grid {
    // https://stackoverflow.com/a/65129916
    background: repeating-conic-gradient(#ffffff 0 25%, #cacaca 0 50%) 50% / 10px 10px;
}

.container {
    position: relative;

    // Pass through to background and close dialog
    pointer-events: none !important;
    .media {
        pointer-events: auto;
        position: absolute;
        max-width: none;
        max-height: none;
    }
}
</style>
