<template>
    <Table class="loader-table">
        <TableHeader>
            <TableRow>
                <TableHead v-for="i in 4">
                    <Skeleton :data-i="i" class="h-2"></Skeleton>
                </TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            <TableRow v-for="i in 12">
                <TableCell colspan="4">
                    <Skeleton :data-i="i + 4" class="h-2"></Skeleton>
                </TableCell>
            </TableRow>
        </TableBody>
    </Table>
</template>

<style lang="scss" scoped>
// Delay the skeleton animations and stagger them
@for $i from 1 through 16 {
    [data-i='#{$i}'] {
        animation-delay: $i * 200ms;
    }
}
</style>
