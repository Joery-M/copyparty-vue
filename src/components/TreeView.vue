<script lang="ts" setup>
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarProvider,
  SidebarRail,
} from "@shadcn/sidebar";
import TreeViewList from "./TreeViewList.vue";
</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu> </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <TreeViewList dir="/" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
    <SidebarInset>
      <slot />
    </SidebarInset>
  </SidebarProvider>
</template>
