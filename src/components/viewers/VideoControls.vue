<script setup lang="ts">
import { formatTimeNoMs } from '@/lib/format';
import { computedWithExternalSetter } from '@/lib/utils';
import { Button } from '@shadcn/button';
import { Slider } from '@shadcn/slider';
import { useEventListener } from '@vueuse/core';
import { Pause, Play, Volume, Volume1, Volume2, VolumeOff } from 'lucide-vue-next';
import { onMounted, ref, type HTMLAttributes } from 'vue';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@shadcn/hover-card';
import { useSettings } from '@/stores/useSettings';

const props = defineProps<{ video: HTMLVideoElement; class?: HTMLAttributes['class'] }>();

const settings = useSettings();

const duration = ref(0);
const time = ref(0);
const isPlaying = computedWithExternalSetter(false, (v) =>
    v ? props.video.play() : props.video.pause()
);
const muted = computedWithExternalSetter(false, (v) => (props.video.muted = v));
const volume = computedWithExternalSetter(
    settings.preview.video.volume,
    (v) => (props.video.volume = settings.preview.video.volume = Math.max(0, Math.min(v, 1)))
);

// For HMR mostly
onMounted(() => {
    time.value = props.video.currentTime;
    isPlaying.setInternal(!props.video.paused);
    duration.value = props.video.duration;
    volume.value = settings.preview.video.volume;
    muted.value = settings.preview.video.muted;
    updateBuffered();
});

useEventListener(
    props.video,
    ['timeupdate', 'seeked', 'seeking'],
    () => (time.value = props.video.currentTime)
);
useEventListener(props.video, ['play', 'playing'], () => isPlaying.setInternal(true));
useEventListener(props.video, 'pause', () => isPlaying.setInternal(false));
useEventListener(props.video, 'click', () => (isPlaying.value = !isPlaying.value));

useEventListener(props.video, ['loadedmetadata', 'loadeddata'], () => {
    duration.value = props.video.duration;
});

const buffered = ref(0);

const updateBuffered = () => {
    const ranges = props.video.buffered;
    let max = 0;
    for (var i = 0; i < ranges.length; i++) {
        const end = ranges.end(i);
        if (end > max) max = end;
    }
    if (max !== buffered.value) buffered.value = max;
};
useEventListener(props.video, ['progress', 'timeupdate'], updateBuffered);
useEventListener(
    props.video,
    'volumechange',
    () => (
        (settings.preview.video.volume = volume.setInternal(props.video.volume)),
        (settings.preview.video.muted = muted.setInternal(props.video.muted))
    )
);
</script>

<template>
    <div class="vid-controls" :class>
        <Button variant="ghost" size="icon" @click="isPlaying = !isPlaying">
            <Pause v-if="isPlaying" />
            <Play v-else />
        </Button>
        <Slider
            :model-value="[time]"
            @update:model-value="$event && video.fastSeek($event[0])"
            @value-commit="video.currentTime = $event[0]"
            :max="duration"
            :loaded="buffered"
            :step="0.001"
        />
        <span class="timestamp"> {{ formatTimeNoMs(time) }} / {{ formatTimeNoMs(duration) }} </span>

        <HoverCard :open-delay="0">
            <HoverCardTrigger>
                <Button
                    variant="ghost"
                    size="icon"
                    @wheel="volume += $event.deltaY / -1000"
                    @pointerdown.stop
                    @click.stop="
                        () => {
                            if (volume !== 0) muted = !muted;
                            volume = volume || 1;
                        }
                    "
                >
                    <VolumeOff v-if="muted || !volume" />
                    <Volume2 v-else-if="volume === 1" />
                    <Volume1 v-else-if="volume >= 0.5" />
                    <Volume v-else />
                </Button>
            </HoverCardTrigger>
            <HoverCardContent class="w-min h-min p-0 py-2.5">
                <Slider
                    class="min-h-24! px-2.5"
                    @wheel="volume += $event.deltaY / -1000"
                    :model-value="[muted ? 0 : volume]"
                    orientation="vertical"
                    :max="1"
                    :step="0.001"
                    @update:model-value="
                        $event && (volume = $event[0]);
                        muted = false;
                    "
                />
            </HoverCardContent>
        </HoverCard>
    </div>
</template>

<style scoped>
@reference "@/style.css";

.vid-controls {
    @apply pointer-events-auto
        absolute left-5 right-5 sm:left-20 sm:right-20 h-8 px-1
        bg-accent rounded-md
        flex items-center gap-2;

    bottom: calc(var(--viewer-margin-bottom) - calc(var(--spacing) * 8));

    > [data-slot='slider'] {
        @apply flex-1 h-8;
    }

    .timestamp {
        @apply min-w-[10ch] text-center;
    }
}
</style>
