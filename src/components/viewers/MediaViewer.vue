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
import { useElementSize, useFullscreen, useKeyModifier } from '@vueuse/core';
import { computed, ref, useTemplateRef, watchEffect } from 'vue';

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
const enableZoomToFit = ref(true);
const enableTransition = ref(false);
const isHoldingShift = useKeyModifier('Shift');

const containerElem = useTemplateRef('container');
const containerSize = useElementSize(containerElem);

const mediaElem = useTemplateRef('media');
const fullscreenElement = useFullscreen(mediaElem);
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
    maxHeight: number,
    minWidth: number,
    minHeight: number
): [number, number] {
    const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return [
        Math.floor(Math.max(srcWidth, minWidth) * ratio),
        Math.floor(Math.max(srcHeight, minHeight) * ratio)
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
    height: mediaSize.value[1] * zoomFactor.value + 'px'
}));

watchEffect(() => {
    if (
        !enableZoomToFit.value ||
        smallestContainerAxis.value == 0 ||
        largestZoomedMediaAxis.value == 0
    )
        return;
    zoomToFit();
});

function clickedZoom() {
    enableTransition.value = true;
    enableZoomToFit.value = false;
}
function clickedRotation() {
    enableTransition.value = true;
}
</script>

<template>
    <div class="wrapper">
        <div class="h-8"></div>
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
                    imageRendering: settings.preview.pixelated ? 'pixelated' : 'smooth'
                }"
                :class="{ ...backgroundClass, 'transition-all': enableTransition }"
                :src="mediaUrl"
                :alt="file.name"
                @transitionend="enableTransition = false"
                @load="isLoading = false"
                @click="zoom(isHoldingShift ? zoomOutFactor : zoomInFactor)"
            />
            <video
                ref="media"
                v-else-if="file.classification === FileClassification.Video"
                class="media"
                :class="{ ...backgroundClass, 'transition-all': enableTransition }"
                :style="computedStyle"
                :src="mediaUrl"
                :alt="file.name"
                @transitionend="enableTransition = false"
                @loadedmetadata="isLoading = false"
                @loadeddata="isLoading = false"
                controls
                autoplay
            />
        </div>
        <DialogFooter
            class="sm:justify-center pointer-events-none! *:pointer-events-auto z-10 h-8"
            style="--spacing: 0.3rem"
        >
            <ButtonGroup>
                <Tooltip :content="$t('viewer.media.background')">
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
                        @click="
                            clickedZoom();
                            settings.preview.pixelated = !settings.preview.pixelated;
                        "
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
                        @click="
                            clickedZoom();
                            zoom(zoomInFactor);
                        "
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
                        @click="
                            clickedZoom();
                            zoomedMediaSize = mediaSize;
                        "
                        variant="accent"
                        size="lg"
                        class="text-base"
                        :aria-label="$t('viewer.media.zoom.reset')"
                    >
                        {{
                            enableZoomToFit
                                ? $t('viewer.media.zoom.fit_perc')
                                : $n(zoomFactor, { style: 'percent' })
                        }}
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.zoom.fit')">
                    <Button
                        @click="
                            enableTransition = true;
                            enableZoomToFit = true;
                        "
                        variant="accent"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.zoom.fit')"
                    >
                        <Fullscreen />
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.zoom.out')">
                    <Button
                        @click="
                            clickedZoom();
                            zoom(zoomOutFactor);
                        "
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
                        @click="
                            clickedRotation();
                            rotation--;
                        "
                        variant="accent"
                        size="icon-lg"
                        :aria-label="$t('viewer.media.rotate_ccw')"
                    >
                        <RotateCcw />
                    </Button>
                </Tooltip>
                <Tooltip :content="$t('viewer.media.rotate_cw')">
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
}

.container {
    @apply self-center justify-self-center h-0 min-w-full flex-1 relative;

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
</style>
