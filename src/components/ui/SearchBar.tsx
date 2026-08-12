"use client";

import React from "react";
import { Group72SearchBar, type Group72SearchBarProps } from "@/src/components/search/group-72-search-bar";

export type SearchBarProps = Group72SearchBarProps;

export default function SearchBar(props: SearchBarProps) {
  return <Group72SearchBar {...props} />;
}
