<script setup lang="ts">
import ImagePixelated from '@/assets/image-pixelated.svg?raw';
import ImageSmooth from '@/assets/image-smooth.svg?raw';
import { getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import type { File } from '@/lib/interop';
import { Fullscreen, PaintBucket, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-vue-next';
import DialogFooter from '../ui/dialog/DialogFooter.vue';

import Tooltip from '@/components/Tooltip.vue';
import { useSettings } from '@/stores/useSettings';
import { Button } from '@shadcn/button';
import { ButtonGroup } from '@shadcn/button-group';
import { Select, SelectContent, SelectGroup, SelectItem } from '@shadcn/select';
import { until, useElementSize, useFullscreen, useKeyModifier } from '@vueuse/core';
import { computed, ref, useTemplateRef } from 'vue';

const props = defineProps<{ file: File }>();

const mediaUrl = getApiUrl(props.file.fullPath);

const settings = useSettings();

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
const isDoneZooming = ref(false);
const isHoldingShift = useKeyModifier('Shift');

const containerElem = useTemplateRef('container');
const containerSize = useElementSize(containerElem);

const mediaElem = useTemplateRef('media');
const fullscreenElement = useFullscreen(mediaElem);
const mediaSize = computed<[number, number]>(() => {
    if (!mediaElem.value || isLoading.value) return [100, 100];
    if (mediaElem.value instanceof HTMLImageElement) {
        return [mediaElem.value.naturalWidth, mediaElem.value.naturalHeight];
    } else if (mediaElem.value instanceof HTMLVideoElement) {
        return [mediaElem.value.videoWidth, mediaElem.value.videoHeight];
    } else {
        return [100, 100];
    }
});

const containerMiddle = computed<[number, number]>(() => [
    containerSize.width.value / 2,
    containerSize.height.value / 2
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
const smallestContainerAxis = computed(() =>
    Math.min(containerSize.width.value, containerSize.height.value)
);
const largestZoomedMediaAxis = computed(() =>
    Math.max(zoomedMediaSize.value[0], zoomedMediaSize.value[1])
);
const zoomFactor = computed(() => largestZoomedMediaAxis.value / largestMediaAxis.value || 0);

function zoom(ratio: number) {
    if (ratio < 0) {
        if (smallestMediaAxis.value < 5) return;
    } else if (ratio > 0 && largestContainerAxis.value > 0) {
        if (largestZoomedMediaAxis.value > largestContainerAxis.value * 8) return;
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
    const isSideways = (rotation.value / 2) % 1 != 0;
    const ratio = calculateFitRatio(
        mediaSize.value[isSideways ? 1 : 0],
        mediaSize.value[isSideways ? 0 : 1],
        containerSize.width.value,
        containerSize.height.value
    );
    zoomedMediaSize.value = ratio;
}

async function loaded() {
    if (!isLoading.value) return;
    isLoading.value = false;
    await Promise.all([
        until(smallestContainerAxis).not.toBe(0),
        until(largestZoomedMediaAxis).not.toBe(0)
    ]);
    // If it's larger than the container on load, resize it
    if (largestZoomedMediaAxis.value > smallestContainerAxis.value) zoomToFit();
    // Not the best, but it prevents jumping at the start
    requestIdleCallback(() => {
        isDoneZooming.value = true;
    });
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
    height: mediaSize.value[1] * zoomFactor.value + 'px'
}));
</script>

<template>
    <div
        class="container self-center justify-self-center h-0 min-w-full flex-1 m-10"
        ref="container"
    >
        <div
            v-if="settings.preview.bgType === 'grid'"
            class="background-grid"
            :class="{ 'transition-all': isDoneZooming }"
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
                imageRendering: settings.preview.pixelated ? 'pixelated' : 'smooth'
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
            :style="computedStyle"
            :src="mediaUrl"
            :alt="file.name"
            @loadedmetadata="loaded()"
            @loadeddata="loaded()"
            controls
            autoplay
        />
    </div>
    <DialogFooter
        class="sm:justify-center pointer-events-none! *:pointer-events-auto z-10"
        style="--spacing: 0.3rem"
    >
        <ButtonGroup>
            <ButtonGroup>
                <Tooltip :content="$t('viewer.media.background')">
                    <Button
                        @click="backgroundTypeSelectOpen = true"
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
            </ButtonGroup>
            <ButtonGroup>
                <Tooltip :content="$t('viewer.media.zoom.in')">
                    <Button
                        @click="zoom(zoomInFactor)"
                        variant="accent"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.zoom.in')"
                        :disabled="largestZoomedMediaAxis > largestContainerAxis * 8"
                    >
                        <ZoomIn />
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.zoom.reset')">
                    <Button
                        @click="zoomedMediaSize = mediaSize"
                        variant="accent"
                        size="lg"
                        class="text-base"
                        :aria-label="$t('viewer.media.zoom.reset')"
                    >
                        {{ $n(zoomFactor, { style: 'percent' }) }}
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.zoom.fit')">
                    <Button
                        @click="zoomToFit()"
                        variant="accent"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.zoom.fit')"
                    >
                        <Fullscreen />
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.zoom.out')">
                    <Button
                        @click="zoom(zoomOutFactor)"
                        :disabled="smallestMediaAxis < 5"
                        variant="accent"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.zoom.out')"
                    >
                        <ZoomOut />
                    </Button>
                </Tooltip>
            </ButtonGroup>
            <ButtonGroup>
                <Tooltip :content="$t('viewer.media.rotate_ccw')">
                    <Button
                        @click="rotation--"
                        variant="accent"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.rotate_ccw')"
                    >
                        <RotateCcw />
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.rotate_cw')">
                    <Button
                        @click="rotation++"
                        variant="accent"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.rotate_cw')"
                    >
                        <RotateCw />
                    </Button>
                </Tooltip>
            </ButtonGroup>
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
</template>

<style lang="scss" scoped>
.container {
    position: relative;

    .background-grid {
        position: absolute;
        background-image: url('@/assets/transparency.png');
        background-size: 10px 10px;
        image-rendering: crisp-edges;
    }

    // Pass through to background and close dialog
    pointer-events: none !important;
    .media {
        pointer-events: auto;
        position: absolute;
        max-width: none;
        max-height: none;

        will-change: transform, top, left;
    }
}
</style>
