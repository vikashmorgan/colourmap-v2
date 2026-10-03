'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/* ── Types ─────────────────────────────────────────────────── */

type Mode =
  | 'sacred'
  | 'burst'
  | 'lissajous'
  | 'golden'
  | 'kaleidoscope'
  | 'torus'
  | 'tunnel'
  | 'vitral'
  | 'fibonacci'
  | 'clifford'
  | 'hypercube'
  | 'warp'
  | 'lorenz'
  | 'knot'
  | 'orbital'
  | 'geodesic'
  | 'rainbow'
  | 'cathedral'
  | 'islamic'
  | 'yantra'
  | 'celtic'
  | 'bloom'
  | 'lava'
  | 'spire'
  | 'lissajous2'
  | 'lissajous3d'
  | 'tknot3d'
  | 'lorenz3d'
  | 'rose3d'
  | 'helix3d'
  | 'orbital3d'
  | 'firework3d'
  | 'fibonacci3d'
  | 'yantra3d'
  | 'rainbow3d'
  | 'prism'
  | 'prism3d'
  | 'liquid'
  | 'cells'
  | 'current'
  | 'currentscales'
  | 'cyclonetiles'
  | 'eddylace'
  | 'magneticsand'
  | 'flowfield'
  | 'flowwalkers'
  | 'flowsacred'
  | 'flowdance'
  | 'flowsands'
  | 'flowbutterfly'
  | 'flowlines'
  | 'eclipse'
  | 'yinyang'
  | 'volcano'
  | 'atomicexplosion'
  | 'gravity'
  | 'fire'
  | 'plasma'
  | 'globe'
  | 'nebula'
  | 'current3d'
  | 'matrix'
  | 'matrix3d'
  | 'pulse'
  | 'archetypesun'
  | 'braintopography'
  | 'walkingfigure'
  | 'dotwalker'
  | 'missionsun'
  | 'dotsunfire'
  | 'dotsunoutward'
  | 'dotalchemicalsun'
  | 'dotheart'
  | 'dotphoenix'
  | 'dotbrain'
  | 'neuronweb'
  | 'embrace'
  | 'dottunnel'
  | 'swirldottunnel'
  | 'linetunnel3d'
  | 'dotroad'
  | 'tripnumber1'
  | 'tripnumber2'
  | 'tripnumber3'
  | 'buddhaboycurrents'
  | 'touchpreset'
  | 'emotion'
  | 'constellation'
  | 'drift'
  | 'cbloom'
  | 'orbit'
  | 'weave'
  | 'chaostri3d'
  | 'chaostrisphere'
  | 'treeoflife'
  | 'treeoflife3d'
  | 'breath'
  | 'stream'
  | 'entropy'
  | 'entropy3d'
  | 'embf3d'
  | 'wordneon'
  | 'hopefear'
  | 'wordecho'
  | 'wordparticle'
  | 'wordweave'
  | 'scriptures'
  | 'scripturesjp'
  | 'metamorph'
  | 'chrysalis'
  | 'chrysalisrings'
  | 'breathform'
  | 'clock3d'
  | 'atomlight'
  | 'butterfly'
  | 'pyramid3d'
  | 'orbitdance'
  | 'ripplemorph'
  | 'kaleido3d'
  | 'mirrortunnel'
  | 'heartwave'
  | 'eyemorph'
  | 'sinmorph3d'
  | 'heartdance'
  | 'infinitedive'
  | 'clockorbit3d'
  | 'musicdots'
  | 'musicnebula'
  | 'musiclattice';

interface Pal {
  bg0: string;
  bg1: string;
  line: string;
  fill: string;
  glow: string;
  dots: string;
  rgb: [number, number, number];
}

interface Cfg {
  preset: string;
  symmetry: number;
  complexity: number;
  glow: number;
  breathSpeed: number;
  intensity: number;
  particles: number;
  luminous: number;
  stars: number;
  mode: Mode;
  danceMove?: DanceMove;
  danceBpm?: number;
  danceAmount?: number;
}

interface Dot {
  a: number;
  r: number;
  s: number;
  sz: number;
  op: number;
  jt: number;
}

interface Ripple {
  x: number;
  y: number;
  born: number;
}

type FingerMode = 'off' | 'ripple' | 'pull' | 'push' | 'light';
type MotionMode = 'animate' | 'static';
type DanceMove = 'still' | 'breath' | 'headnod' | 'armrise' | 'pulse';
type LiveMode = 'studio' | 'control' | 'projection';

type GeometryLivePayload = {
  presetName?: string;
  cfg?: Partial<Cfg>;
  updatedAt?: number;
  sourceId?: string;
};

/* ── Palettes ───────────────────────────────────────────────── */

export const PAL: Record<string, Pal> = {
  'Calm Field': {
    bg0: '#120a04',
    bg1: '#080401',
    line: 'rgba(196,160,96,0.55)',
    fill: 'rgba(196,160,96,0.06)',
    glow: 'rgba(196,155,80,0.38)',
    dots: 'rgba(225,200,155,0.65)',
    rgb: [196, 160, 96],
  },
  'Golden Source': {
    bg0: '#130900',
    bg1: '#070300',
    line: 'rgba(255,195,35,0.65)',
    fill: 'rgba(255,180,20,0.07)',
    glow: 'rgba(240,165,15,0.45)',
    dots: 'rgba(255,215,85,0.7)',
    rgb: [255, 195, 35],
  },
  'Blue Astral': {
    bg0: '#030a14',
    bg1: '#010407',
    line: 'rgba(105,170,255,0.6)',
    fill: 'rgba(80,140,235,0.06)',
    glow: 'rgba(65,135,255,0.36)',
    dots: 'rgba(150,200,255,0.7)',
    rgb: [105, 170, 255],
  },
  'Violet Portal': {
    bg0: '#0a0412',
    bg1: '#050208',
    line: 'rgba(175,90,255,0.65)',
    fill: 'rgba(165,75,255,0.07)',
    glow: 'rgba(150,60,255,0.42)',
    dots: 'rgba(200,140,255,0.7)',
    rgb: [175, 90, 255],
  },
  'Forest Ceremony': {
    bg0: '#021008',
    bg1: '#010703',
    line: 'rgba(65,195,140,0.6)',
    fill: 'rgba(50,175,120,0.06)',
    glow: 'rgba(40,170,115,0.35)',
    dots: 'rgba(110,215,160,0.7)',
    rgb: [65, 195, 140],
  },
  'Minimal Light': {
    bg0: '#0e0c0a',
    bg1: '#070604',
    line: 'rgba(238,230,215,0.5)',
    fill: 'rgba(230,220,200,0.04)',
    glow: 'rgba(215,205,188,0.24)',
    dots: 'rgba(245,238,225,0.6)',
    rgb: [238, 230, 215],
  },
  'DMT Vision': {
    bg0: '#0e0614',
    bg1: '#060208',
    line: 'rgba(255,190,60,0.72)',
    fill: 'rgba(255,190,60,0.08)',
    glow: 'rgba(255,160,30,0.52)',
    dots: 'rgba(255,215,100,0.75)',
    rgb: [255, 190, 60],
  },
  'Cosmic Indigo': {
    bg0: '#080316',
    bg1: '#030109',
    line: 'rgba(140,100,255,0.65)',
    fill: 'rgba(140,100,255,0.07)',
    glow: 'rgba(120,80,255,0.42)',
    dots: 'rgba(180,150,255,0.72)',
    rgb: [140, 100, 255],
  },
  'Warp Tunnel': {
    bg0: '#010510',
    bg1: '#010209',
    line: 'rgba(80,240,255,0.65)',
    fill: 'rgba(60,220,255,0.08)',
    glow: 'rgba(50,210,255,0.42)',
    dots: 'rgba(140,255,255,0.7)',
    rgb: [80, 240, 255],
  },
  'Sacred Vitral': {
    bg0: '#050204',
    bg1: '#020102',
    line: 'rgba(220,180,80,0.6)',
    fill: 'rgba(220,180,80,0.05)',
    glow: 'rgba(200,160,60,0.35)',
    dots: 'rgba(240,210,120,0.65)',
    rgb: [220, 180, 80],
  },
  'Fibonacci Bloom': {
    bg0: '#090600',
    bg1: '#040200',
    line: 'rgba(255,200,40,0.65)',
    fill: 'rgba(255,185,20,0.07)',
    glow: 'rgba(240,170,10,0.45)',
    dots: 'rgba(255,220,90,0.72)',
    rgb: [255, 200, 40],
  },
  'Clifford Dream': {
    bg0: '#030010',
    bg1: '#010008',
    line: 'rgba(120,80,255,0.65)',
    fill: 'rgba(110,70,255,0.07)',
    glow: 'rgba(100,60,255,0.42)',
    dots: 'rgba(170,130,255,0.72)',
    rgb: [120, 80, 255],
  },
  '4D Crystal': {
    bg0: '#020308',
    bg1: '#010205',
    line: 'rgba(160,220,255,0.65)',
    fill: 'rgba(140,200,255,0.07)',
    glow: 'rgba(120,190,255,0.42)',
    dots: 'rgba(200,235,255,0.72)',
    rgb: [160, 220, 255],
  },
  'Warp Drive': {
    bg0: '#000508',
    bg1: '#000204',
    line: 'rgba(80,255,200,0.65)',
    fill: 'rgba(60,240,180,0.07)',
    glow: 'rgba(50,230,170,0.42)',
    dots: 'rgba(140,255,220,0.72)',
    rgb: [80, 255, 200],
  },
  'Lorenz Storm': {
    bg0: '#030612',
    bg1: '#010308',
    line: 'rgba(80,180,255,0.65)',
    fill: 'rgba(60,160,255,0.07)',
    glow: 'rgba(50,150,255,0.40)',
    dots: 'rgba(140,210,255,0.72)',
    rgb: [80, 180, 255],
  },
  'Knot Garden': {
    bg0: '#080010',
    bg1: '#040008',
    line: 'rgba(200,100,255,0.65)',
    fill: 'rgba(180,80,255,0.07)',
    glow: 'rgba(160,60,255,0.40)',
    dots: 'rgba(220,150,255,0.72)',
    rgb: [200, 100, 255],
  },
  'Orbital Shell': {
    bg0: '#001408',
    bg1: '#000a04',
    line: 'rgba(80,255,160,0.65)',
    fill: 'rgba(60,240,140,0.07)',
    glow: 'rgba(50,220,130,0.40)',
    dots: 'rgba(140,255,200,0.72)',
    rgb: [80, 255, 160],
  },
  'Crystal Lattice': {
    bg0: '#060610',
    bg1: '#030308',
    line: 'rgba(200,220,255,0.65)',
    fill: 'rgba(180,200,255,0.07)',
    glow: 'rgba(160,190,255,0.40)',
    dots: 'rgba(220,235,255,0.72)',
    rgb: [200, 220, 255],
  },
  Matrix: {
    bg0: '#000800',
    bg1: '#000400',
    line: 'rgba(0,255,65,0.65)',
    fill: 'rgba(0,255,65,0.06)',
    glow: 'rgba(0,200,50,0.38)',
    dots: 'rgba(100,255,130,0.70)',
    rgb: [0, 255, 65],
  },
  'Islamic Garden': {
    bg0: '#020810',
    bg1: '#010408',
    line: 'rgba(100,210,200,0.65)',
    fill: 'rgba(80,190,180,0.06)',
    glow: 'rgba(60,180,170,0.38)',
    dots: 'rgba(160,240,230,0.72)',
    rgb: [100, 210, 200],
  },
  'Yantra Fire': {
    bg0: '#100200',
    bg1: '#060100',
    line: 'rgba(255,120,30,0.68)',
    fill: 'rgba(255,100,20,0.06)',
    glow: 'rgba(220,80,10,0.42)',
    dots: 'rgba(255,180,80,0.72)',
    rgb: [255, 120, 30],
  },
  'Celtic Forest': {
    bg0: '#010a03',
    bg1: '#010502',
    line: 'rgba(60,210,100,0.65)',
    fill: 'rgba(50,190,80,0.06)',
    glow: 'rgba(40,170,70,0.38)',
    dots: 'rgba(120,240,150,0.72)',
    rgb: [60, 210, 100],
  },
  'Laser Dome': {
    bg0: '#060008',
    bg1: '#030005',
    line: 'rgba(255,60,200,0.65)',
    fill: 'rgba(255,60,200,0.06)',
    glow: 'rgba(200,30,255,0.40)',
    dots: 'rgba(255,140,255,0.72)',
    rgb: [255, 60, 200],
  },
  'Sacred Architecture': {
    bg0: '#080500',
    bg1: '#040200',
    line: 'rgba(220,175,70,0.65)',
    fill: 'rgba(200,155,50,0.06)',
    glow: 'rgba(180,130,40,0.38)',
    dots: 'rgba(240,210,110,0.72)',
    rgb: [220, 175, 70],
  },
  'Pale Gold': {
    bg0: '#0c0b04',
    bg1: '#060500',
    line: 'rgba(240,225,150,0.6)',
    fill: 'rgba(240,225,150,0.05)',
    glow: 'rgba(230,215,130,0.30)',
    dots: 'rgba(252,242,190,0.68)',
    rgb: [240, 225, 150],
  },
  'Rose Quartz': {
    bg0: '#0e0408',
    bg1: '#070204',
    line: 'rgba(255,165,195,0.62)',
    fill: 'rgba(255,150,180,0.06)',
    glow: 'rgba(240,130,165,0.32)',
    dots: 'rgba(255,200,220,0.70)',
    rgb: [255, 165, 195],
  },
  'Neon Mint': {
    bg0: '#01080a',
    bg1: '#010405',
    line: 'rgba(60,255,200,0.65)',
    fill: 'rgba(40,240,180,0.06)',
    glow: 'rgba(30,220,170,0.34)',
    dots: 'rgba(130,255,230,0.70)',
    rgb: [60, 255, 200],
  },
  'Deep Crimson': {
    bg0: '#0e0101',
    bg1: '#060000',
    line: 'rgba(255,60,80,0.65)',
    fill: 'rgba(240,40,60,0.06)',
    glow: 'rgba(220,30,50,0.36)',
    dots: 'rgba(255,120,140,0.70)',
    rgb: [255, 60, 80],
  },
  'Amber Dust': {
    bg0: '#0d0800',
    bg1: '#060400',
    line: 'rgba(190,145,75,0.6)',
    fill: 'rgba(175,130,60,0.05)',
    glow: 'rgba(160,115,45,0.32)',
    dots: 'rgba(210,170,100,0.68)',
    rgb: [190, 145, 75],
  },
  'Old Bronze': {
    bg0: '#0a0600',
    bg1: '#050300',
    line: 'rgba(155,110,55,0.6)',
    fill: 'rgba(140,95,40,0.05)',
    glow: 'rgba(125,85,35,0.30)',
    dots: 'rgba(180,135,75,0.65)',
    rgb: [155, 110, 55],
  },
  'Warm Sienna': {
    bg0: '#0c0401',
    bg1: '#060200',
    line: 'rgba(175,100,55,0.6)',
    fill: 'rgba(160,85,40,0.05)',
    glow: 'rgba(145,75,35,0.30)',
    dots: 'rgba(200,130,80,0.65)',
    rgb: [175, 100, 55],
  },
  Parchment: {
    bg0: '#0d0b07',
    bg1: '#070602',
    line: 'rgba(210,195,155,0.55)',
    fill: 'rgba(200,185,140,0.04)',
    glow: 'rgba(185,170,125,0.25)',
    dots: 'rgba(228,215,175,0.62)',
    rgb: [210, 195, 155],
  },
  'Rainbow Mist': {
    bg0: '#050508',
    bg1: '#020205',
    line: 'rgba(180,160,210,0.58)',
    fill: 'rgba(165,140,200,0.05)',
    glow: 'rgba(150,120,200,0.30)',
    dots: 'rgba(210,195,240,0.65)',
    rgb: [180, 160, 210],
  },
  'Prism Warm': {
    bg0: '#080400',
    bg1: '#040200',
    line: 'rgba(255,215,120,0.60)',
    fill: 'rgba(255,200,80,0.06)',
    glow: 'rgba(255,180,60,0.32)',
    dots: 'rgba(255,235,160,0.70)',
    rgb: [255, 215, 120],
  },
  'Prism Ice': {
    bg0: '#00050a',
    bg1: '#000308',
    line: 'rgba(160,220,255,0.60)',
    fill: 'rgba(120,200,255,0.05)',
    glow: 'rgba(100,180,255,0.30)',
    dots: 'rgba(200,240,255,0.68)',
    rgb: [160, 220, 255],
  },
  'Prism Rose': {
    bg0: '#080006',
    bg1: '#040003',
    line: 'rgba(255,140,200,0.58)',
    fill: 'rgba(255,100,180,0.05)',
    glow: 'rgba(240,80,160,0.28)',
    dots: 'rgba(255,190,230,0.65)',
    rgb: [255, 140, 200],
  },
  'Prism Forest': {
    bg0: '#000a04',
    bg1: '#000602',
    line: 'rgba(100,220,140,0.58)',
    fill: 'rgba(80,200,120,0.05)',
    glow: 'rgba(60,180,100,0.28)',
    dots: 'rgba(150,240,180,0.65)',
    rgb: [100, 220, 140],
  },
  'Prism Void': {
    bg0: '#030010',
    bg1: '#020008',
    line: 'rgba(160,100,255,0.60)',
    fill: 'rgba(140,80,240,0.06)',
    glow: 'rgba(120,60,220,0.30)',
    dots: 'rgba(200,160,255,0.68)',
    rgb: [160, 100, 255],
  },
  'Liquid Pearl': {
    bg0: '#030305',
    bg1: '#010102',
    line: 'rgba(220,220,235,0.65)',
    fill: 'rgba(200,200,220,0.05)',
    glow: 'rgba(180,180,210,0.28)',
    dots: 'rgba(240,240,255,0.72)',
    rgb: [220, 220, 235],
  },
  'Cell Biolum': {
    bg0: '#000a04',
    bg1: '#000502',
    line: 'rgba(80,220,140,0.62)',
    fill: 'rgba(60,200,120,0.05)',
    glow: 'rgba(40,180,100,0.26)',
    dots: 'rgba(130,240,175,0.68)',
    rgb: [80, 220, 140],
  },
  'Deep Current': {
    bg0: '#000510',
    bg1: '#000308',
    line: 'rgba(55,155,220,0.62)',
    fill: 'rgba(40,130,200,0.05)',
    glow: 'rgba(25,110,190,0.26)',
    dots: 'rgba(100,190,255,0.68)',
    rgb: [55, 155, 220],
  },
  'Solar Plasma': {
    bg0: '#0a0300',
    bg1: '#060200',
    line: 'rgba(255,195,60,0.65)',
    fill: 'rgba(255,170,30,0.06)',
    glow: 'rgba(255,140,10,0.30)',
    dots: 'rgba(255,230,140,0.72)',
    rgb: [255, 195, 60],
  },
  'Terra Globe': {
    bg0: '#000508',
    bg1: '#000305',
    line: 'rgba(55,175,200,0.60)',
    fill: 'rgba(40,155,180,0.05)',
    glow: 'rgba(25,135,160,0.26)',
    dots: 'rgba(100,210,230,0.68)',
    rgb: [55, 175, 200],
  },
  'Matrix Green': {
    bg0: '#000a02',
    bg1: '#000601',
    line: 'rgba(50,240,100,0.68)',
    fill: 'rgba(30,200,80,0.05)',
    glow: 'rgba(20,180,70,0.30)',
    dots: 'rgba(100,255,140,0.75)',
    rgb: [50, 240, 100],
  },
  'Matrix Indigo': {
    bg0: '#01000e',
    bg1: '#010008',
    line: 'rgba(120,80,255,0.65)',
    fill: 'rgba(100,60,240,0.05)',
    glow: 'rgba(80,40,220,0.28)',
    dots: 'rgba(180,140,255,0.72)',
    rgb: [120, 80, 255],
  },
  'Matrix Crimson': {
    bg0: '#0a0001',
    bg1: '#060001',
    line: 'rgba(255,50,70,0.72)',
    fill: 'rgba(220,30,50,0.05)',
    glow: 'rgba(200,20,40,0.32)',
    dots: 'rgba(255,110,120,0.78)',
    rgb: [255, 50, 70],
  },
  'Matrix Gold': {
    bg0: '#0a0700',
    bg1: '#060400',
    line: 'rgba(240,185,30,0.75)',
    fill: 'rgba(220,165,15,0.07)',
    glow: 'rgba(200,145,10,0.40)',
    dots: 'rgba(255,215,90,0.80)',
    rgb: [240, 185, 30],
  },
  'Matrix Arctic': {
    bg0: '#000408',
    bg1: '#000205',
    line: 'rgba(140,230,255,0.72)',
    fill: 'rgba(100,210,255,0.06)',
    glow: 'rgba(80,200,255,0.35)',
    dots: 'rgba(200,245,255,0.78)',
    rgb: [140, 230, 255],
  },
  'Matrix Sacred': {
    bg0: '#04000a',
    bg1: '#020006',
    line: 'rgba(200,140,255,0.70)',
    fill: 'rgba(180,110,255,0.06)',
    glow: 'rgba(160,90,240,0.35)',
    dots: 'rgba(230,190,255,0.78)',
    rgb: [200, 140, 255],
  },
  'Tangka Gold': {
    bg0: '#0a0600',
    bg1: '#060400',
    line: 'rgba(255,185,30,0.72)',
    fill: 'rgba(240,160,20,0.07)',
    glow: 'rgba(220,140,10,0.38)',
    dots: 'rgba(255,220,110,0.78)',
    rgb: [255, 185, 30],
  },
  'Tangka Crimson': {
    bg0: '#0a0002',
    bg1: '#060001',
    line: 'rgba(230,50,70,0.68)',
    fill: 'rgba(210,40,55,0.06)',
    glow: 'rgba(190,30,45,0.30)',
    dots: 'rgba(255,110,125,0.72)',
    rgb: [230, 50, 70],
  },
  'Tangka Lapis': {
    bg0: '#00020e',
    bg1: '#000109',
    line: 'rgba(40,110,230,0.68)',
    fill: 'rgba(30,90,210,0.06)',
    glow: 'rgba(20,75,200,0.28)',
    dots: 'rgba(100,170,255,0.72)',
    rgb: [40, 110, 230],
  },
};

function _rgbHue(r: number, g: number, b: number): number {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return h / 6;
}
const PAL_SORTED: [string, Pal][] = Object.entries(PAL).sort(
  (a, b) => _rgbHue(...a[1].rgb) - _rgbHue(...b[1].rgb),
);

/* ── Preset configs ─────────────────────────────────────────── */

export const PRESETS: Record<string, Cfg> = {
  'Fire Dot Sun': {
    preset: 'Golden Source',
    symmetry: 11,
    complexity: 6.8,
    glow: 7.8,
    breathSpeed: 0.78,
    intensity: 8.4,
    particles: 7,
    luminous: 3.4,
    stars: 2,
    mode: 'dotsunfire',
  },
  'Outward Sun': {
    preset: 'Golden Source',
    symmetry: 12,
    complexity: 5.8,
    glow: 7.4,
    breathSpeed: 0.62,
    intensity: 8.6,
    particles: 7,
    luminous: 3.2,
    stars: 2,
    mode: 'dotsunoutward',
  },
  'Dot Walker': {
    preset: 'Golden Source',
    symmetry: 1,
    complexity: 7,
    glow: 7,
    breathSpeed: 0.9,
    intensity: 7.6,
    particles: 7,
    luminous: 2.8,
    stars: 1,
    mode: 'dotwalker',
  },
  'Mission Sun': {
    preset: 'Golden Source',
    symmetry: 9,
    complexity: 7.6,
    glow: 4.2,
    breathSpeed: 0.9,
    intensity: 9.2,
    particles: 8,
    luminous: 2.4,
    stars: 8,
    mode: 'missionsun',
  },
  'Calm Field': {
    preset: 'Calm Field',
    symmetry: 8,
    complexity: 4,
    glow: 5,
    breathSpeed: 0.8,
    intensity: 6.5,
    particles: 4,
    luminous: 3,
    stars: 2,
    mode: 'sacred',
  },
  'Mode Sun': {
    preset: 'Golden Source',
    symmetry: 7,
    complexity: 6,
    glow: 7,
    breathSpeed: 0.85,
    intensity: 8,
    particles: 4,
    luminous: 3,
    stars: 2,
    mode: 'archetypesun',
  },
  'Brain Topography': {
    preset: 'Golden Source',
    symmetry: 12,
    complexity: 7.2,
    glow: 6.6,
    breathSpeed: 0.72,
    intensity: 7.4,
    particles: 9,
    luminous: 2.6,
    stars: 1,
    mode: 'braintopography',
  },
  'Walking Figure': {
    preset: 'Calm Field',
    symmetry: 5,
    complexity: 5.5,
    glow: 5.8,
    breathSpeed: 0.95,
    intensity: 7,
    particles: 5,
    luminous: 2.2,
    stars: 1,
    mode: 'walkingfigure',
  },
  'Alchemical Dot Sun': {
    preset: 'Golden Source',
    symmetry: 12,
    complexity: 6.2,
    glow: 5.5,
    breathSpeed: 0.62,
    intensity: 8,
    particles: 7,
    luminous: 3,
    stars: 1,
    mode: 'dotalchemicalsun',
  },
  'Dot Heart': {
    preset: 'Golden Source',
    symmetry: 9,
    complexity: 6.4,
    glow: 7.2,
    breathSpeed: 0.72,
    intensity: 8,
    particles: 8,
    luminous: 3,
    stars: 1,
    mode: 'dotheart',
  },
  'Dot Phoenix': {
    preset: 'Yantra Fire',
    symmetry: 9,
    complexity: 7.2,
    glow: 7.6,
    breathSpeed: 0.56,
    intensity: 8.8,
    particles: 9,
    luminous: 3.4,
    stars: 2,
    mode: 'dotphoenix',
  },
  'Dot Brain Loop': {
    preset: 'Golden Source',
    symmetry: 12,
    complexity: 6.8,
    glow: 6.4,
    breathSpeed: 0.48,
    intensity: 7.4,
    particles: 9,
    luminous: 2.8,
    stars: 1,
    mode: 'dotbrain',
  },
  'Neuron Web 1': {
    preset: 'Golden Source',
    symmetry: 7,
    complexity: 4.2,
    glow: 5.6,
    breathSpeed: 0.38,
    intensity: 7.4,
    particles: 8,
    luminous: 2.8,
    stars: 2,
    mode: 'neuronweb',
  },
  'Neuron Web 2': {
    preset: 'Blue Astral',
    symmetry: 9,
    complexity: 5.8,
    glow: 6.4,
    breathSpeed: 0.48,
    intensity: 7.8,
    particles: 8,
    luminous: 3,
    stars: 3,
    mode: 'neuronweb',
  },
  'Neuron Web 3': {
    preset: 'Tangka Gold',
    symmetry: 12,
    complexity: 7.2,
    glow: 7,
    breathSpeed: 0.56,
    intensity: 8.3,
    particles: 9,
    luminous: 3.2,
    stars: 4,
    mode: 'neuronweb',
  },
  'Neuron Web 4': {
    preset: 'Matrix Sacred',
    symmetry: 14,
    complexity: 8.2,
    glow: 7.6,
    breathSpeed: 0.62,
    intensity: 8.6,
    particles: 9,
    luminous: 3.5,
    stars: 5,
    mode: 'neuronweb',
  },
  'Neuron Web 5': {
    preset: 'Cosmic Indigo',
    symmetry: 16,
    complexity: 9.2,
    glow: 8.2,
    breathSpeed: 0.72,
    intensity: 9,
    particles: 10,
    luminous: 3.8,
    stars: 6,
    mode: 'neuronweb',
  },

  Embrace: {
    preset: 'Golden Source',
    symmetry: 8,
    complexity: 8,
    glow: 6.8,
    breathSpeed: 0.42,
    intensity: 8.4,
    particles: 9,
    luminous: 2.8,
    stars: 1,
    mode: 'embrace',
  },

  'Dot Tunnel': {
    preset: 'Blue Astral',
    symmetry: 14,
    complexity: 7.2,
    glow: 6.8,
    breathSpeed: 0.72,
    intensity: 7.8,
    particles: 9,
    luminous: 2.7,
    stars: 4,
    mode: 'dottunnel',
  },
  'Swirl Dot Tunnel': {
    preset: 'Golden Source',
    symmetry: 13,
    complexity: 8.4,
    glow: 20,
    breathSpeed: 0.13,
    intensity: 8.8,
    particles: 10,
    luminous: 4.2,
    stars: 7,
    mode: 'swirldottunnel',
  },
  'Line Tunnel 3D': {
    preset: 'Blue Astral',
    symmetry: 12,
    complexity: 7.4,
    glow: 6.2,
    breathSpeed: 0.64,
    intensity: 7.5,
    particles: 6,
    luminous: 2.4,
    stars: 3,
    mode: 'linetunnel3d',
  },
  'Dot Road': {
    preset: 'Golden Source',
    symmetry: 7,
    complexity: 7,
    glow: 5.6,
    breathSpeed: 0.68,
    intensity: 7.8,
    particles: 9,
    luminous: 2.6,
    stars: 2,
    mode: 'dotroad',
  },

  'Trip Number 1': {
    preset: 'Golden Source',
    symmetry: 10,
    complexity: 7.6,
    glow: 6.8,
    breathSpeed: 0.34,
    intensity: 8.4,
    particles: 9,
    luminous: 2.8,
    stars: 3,
    mode: 'tripnumber1',
  },
  'Trip Number 2': {
    preset: 'Amber Dust',
    symmetry: 9,
    complexity: 6.8,
    glow: 3.2,
    breathSpeed: 0.2,
    intensity: 9.2,
    particles: 9,
    luminous: 3.6,
    stars: 4,
    mode: 'tripnumber2',
  },
  'Trip Number 3': {
    preset: 'Golden Source',
    symmetry: 12,
    complexity: 7.4,
    glow: 4.8,
    breathSpeed: 0.86,
    intensity: 8.8,
    particles: 8,
    luminous: 3.8,
    stars: 5,
    mode: 'tripnumber3',
  },
  'Buddha Boy Currents': {
    preset: 'Golden Source',
    symmetry: 9,
    complexity: 6.8,
    glow: 5.4,
    breathSpeed: 0.66,
    intensity: 8.2,
    particles: 8,
    luminous: 3.8,
    stars: 5,
    mode: 'buddhaboycurrents',
    danceMove: 'headnod',
    danceBpm: 92,
    danceAmount: 5,
  },
  'Touch Preset': {
    preset: 'Golden Source',
    symmetry: 9,
    complexity: 7.8,
    glow: 7.2,
    breathSpeed: 0.85,
    intensity: 8.4,
    particles: 9,
    luminous: 3,
    stars: 0,
    mode: 'touchpreset',
  },

  'Golden Source': {
    preset: 'Golden Source',
    symmetry: 12,
    complexity: 6,
    glow: 8,
    breathSpeed: 1.2,
    intensity: 9,
    particles: 5,
    luminous: 4,
    stars: 1,
    mode: 'sacred',
  },
  'Blue Astral': {
    preset: 'Blue Astral',
    symmetry: 10,
    complexity: 7,
    glow: 7,
    breathSpeed: 1.0,
    intensity: 7,
    particles: 6,
    luminous: 4,
    stars: 4,
    mode: 'sacred',
  },
  'Lissajous 3D': {
    preset: 'Blue Astral',
    symmetry: 3,
    complexity: 2,
    glow: 5,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 4,
    luminous: 1,
    stars: 2,
    mode: 'lissajous3d',
  },
  'Torus Knot': {
    preset: 'Violet Portal',
    symmetry: 2,
    complexity: 3,
    glow: 5,
    breathSpeed: 0.3,
    intensity: 8,
    particles: 3,
    luminous: 1,
    stars: 3,
    mode: 'tknot3d',
  },
  'Lorenz 3D': {
    preset: 'Lorenz Storm',
    symmetry: 10,
    complexity: 14,
    glow: 5,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 3,
    luminous: 1,
    stars: 2,
    mode: 'lorenz3d',
  },
  'Rose 3D': {
    preset: 'Yantra Fire',
    symmetry: 3,
    complexity: 5,
    glow: 2,
    breathSpeed: 0.35,
    intensity: 8,
    particles: 5,
    luminous: 1,
    stars: 2,
    mode: 'rose3d',
  },
  'Helix 3D': {
    preset: 'Celtic Forest',
    symmetry: 3,
    complexity: 4,
    glow: 6,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 4,
    luminous: 1,
    stars: 2,
    mode: 'helix3d',
  },
  'Orbital 3D': {
    preset: 'Orbital Shell',
    symmetry: 8,
    complexity: 3,
    glow: 4,
    breathSpeed: 0.3,
    intensity: 7,
    particles: 5,
    luminous: 1,
    stars: 3,
    mode: 'orbital3d',
  },
  'Firework 3D': {
    preset: 'DMT Vision',
    symmetry: 24,
    complexity: 6,
    glow: 5,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 5,
    luminous: 1,
    stars: 3,
    mode: 'firework3d',
  },
  'Fibonacci 3D': {
    preset: 'Fibonacci Bloom',
    symmetry: 8,
    complexity: 5,
    glow: 4,
    breathSpeed: 0.35,
    intensity: 7,
    particles: 6,
    luminous: 1,
    stars: 2,
    mode: 'fibonacci3d',
  },
  'Yantra 3D': {
    preset: 'Yantra Fire',
    symmetry: 9,
    complexity: 5,
    glow: 5,
    breathSpeed: 0.3,
    intensity: 8,
    particles: 4,
    luminous: 1,
    stars: 2,
    mode: 'yantra3d',
  },
  'Rainbow 3D': {
    preset: 'Laser Dome',
    symmetry: 12,
    complexity: 6,
    glow: 8,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 4,
    luminous: 1,
    stars: 3,
    mode: 'rainbow3d',
  },
  'Violet Portal': {
    preset: 'Violet Portal',
    symmetry: 16,
    complexity: 8,
    glow: 9,
    breathSpeed: 1.4,
    intensity: 8,
    particles: 7,
    luminous: 5,
    stars: 3,
    mode: 'sacred',
  },
  'Forest Ceremony': {
    preset: 'Forest Ceremony',
    symmetry: 6,
    complexity: 5,
    glow: 6,
    breathSpeed: 0.9,
    intensity: 7,
    particles: 5,
    luminous: 3,
    stars: 1,
    mode: 'sacred',
  },
  'Minimal Light': {
    preset: 'Minimal Light',
    symmetry: 4,
    complexity: 3,
    glow: 3,
    breathSpeed: 0.6,
    intensity: 4,
    particles: 2,
    luminous: 3,
    stars: 5,
    mode: 'sacred',
  },
  'DMT Vision': {
    preset: 'DMT Vision',
    symmetry: 16,
    complexity: 8,
    glow: 9,
    breathSpeed: 1.0,
    intensity: 9,
    particles: 6,
    luminous: 5,
    stars: 2,
    mode: 'burst',
  },
  'Cosmic Indigo': {
    preset: 'Cosmic Indigo',
    symmetry: 12,
    complexity: 7,
    glow: 8,
    breathSpeed: 0.9,
    intensity: 8,
    particles: 5,
    luminous: 5,
    stars: 6,
    mode: 'kaleidoscope',
  },
  'Warp Tunnel': {
    preset: 'Warp Tunnel',
    symmetry: 8,
    complexity: 6,
    glow: 7,
    breathSpeed: 1.4,
    intensity: 9,
    particles: 2,
    luminous: 5,
    stars: 8,
    mode: 'tunnel',
  },
  'Sacred Vitral': {
    preset: 'Sacred Vitral',
    symmetry: 12,
    complexity: 6,
    glow: 5,
    breathSpeed: 0.6,
    intensity: 7,
    particles: 0,
    luminous: 4,
    stars: 0,
    mode: 'vitral',
  },
  'Fibonacci Bloom': {
    preset: 'Fibonacci Bloom',
    symmetry: 5,
    complexity: 6,
    glow: 7,
    breathSpeed: 0.8,
    intensity: 8,
    particles: 2,
    luminous: 5,
    stars: 3,
    mode: 'fibonacci',
  },
  'Clifford Dream': {
    preset: 'Clifford Dream',
    symmetry: 8,
    complexity: 6,
    glow: 6,
    breathSpeed: 0.4,
    intensity: 9,
    particles: 0,
    luminous: 5,
    stars: 4,
    mode: 'clifford',
  },
  '4D Crystal': {
    preset: '4D Crystal',
    symmetry: 8,
    complexity: 5,
    glow: 8,
    breathSpeed: 0.7,
    intensity: 8,
    particles: 0,
    luminous: 5,
    stars: 5,
    mode: 'hypercube',
  },
  'Warp Drive': {
    preset: 'Warp Drive',
    symmetry: 12,
    complexity: 6,
    glow: 7,
    breathSpeed: 1.4,
    intensity: 9,
    particles: 0,
    luminous: 5,
    stars: 9,
    mode: 'warp',
  },
  'Lorenz Storm': {
    preset: 'Lorenz Storm',
    symmetry: 8,
    complexity: 4,
    glow: 7,
    breathSpeed: 0.6,
    intensity: 8,
    particles: 0,
    luminous: 5,
    stars: 5,
    mode: 'lorenz',
  },
  'Knot Garden': {
    preset: 'Knot Garden',
    symmetry: 3,
    complexity: 3,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 5,
    stars: 4,
    mode: 'knot',
  },
  'Orbital Shell': {
    preset: 'Orbital Shell',
    symmetry: 6,
    complexity: 2,
    glow: 6,
    breathSpeed: 0.7,
    intensity: 8,
    particles: 0,
    luminous: 5,
    stars: 3,
    mode: 'orbital',
  },
  'Crystal Lattice': {
    preset: 'Crystal Lattice',
    symmetry: 3,
    complexity: 5,
    glow: 8,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 4,
    stars: 6,
    mode: 'geodesic',
  },
  Matrix: {
    preset: 'Matrix',
    symmetry: 8,
    complexity: 4,
    glow: 5,
    breathSpeed: 0.2,
    intensity: 7,
    particles: 2,
    luminous: 2,
    stars: 0,
    mode: 'sacred',
  },
  'Islamic Garden': {
    preset: 'Islamic Garden',
    symmetry: 12,
    complexity: 5,
    glow: 5,
    breathSpeed: 0.18,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 1,
    mode: 'islamic',
  },
  'Yantra Fire': {
    preset: 'Yantra Fire',
    symmetry: 9,
    complexity: 5,
    glow: 5,
    breathSpeed: 0.15,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'yantra',
  },
  'Celtic Forest': {
    preset: 'Celtic Forest',
    symmetry: 6,
    complexity: 3,
    glow: 4,
    breathSpeed: 0.2,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 1,
    mode: 'celtic',
  },
  'Laser Dome': {
    preset: 'Laser Dome',
    symmetry: 12,
    complexity: 6,
    glow: 8,
    breathSpeed: 0.5,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 2,
    mode: 'rainbow',
  },
  'Sacred Architecture': {
    preset: 'Sacred Architecture',
    symmetry: 8,
    complexity: 5,
    glow: 6,
    breathSpeed: 0.2,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 1,
    mode: 'cathedral',
  },
  'Infinite Bloom': {
    preset: 'Infinite Bloom',
    symmetry: 8,
    complexity: 7,
    glow: 6,
    breathSpeed: 0.25,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 2,
    mode: 'bloom',
  },
  'Lava Dream': {
    preset: 'Lava Dream',
    symmetry: 6,
    complexity: 6,
    glow: 7,
    breathSpeed: 0.18,
    intensity: 9,
    particles: 0,
    luminous: 4,
    stars: 0,
    mode: 'lava',
  },
  'Gothic Spire': {
    preset: 'Gothic Spire',
    symmetry: 12,
    complexity: 7,
    glow: 6,
    breathSpeed: 0.15,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 1,
    mode: 'spire',
  },
  'Prism Seed': {
    preset: 'Prism Warm',
    symmetry: 6,
    complexity: 4,
    glow: 9,
    breathSpeed: 0.4,
    intensity: 7,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'prism',
  },
  'Prism Bloom': {
    preset: 'Prism Rose',
    symmetry: 8,
    complexity: 6,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'prism',
  },
  'Cathedral Glass': {
    preset: 'Prism Warm',
    symmetry: 12,
    complexity: 7,
    glow: 5,
    breathSpeed: 0.3,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'prism',
  },
  'Solar Crown': {
    preset: 'Prism Ice',
    symmetry: 10,
    complexity: 6,
    glow: 3,
    breathSpeed: 0.6,
    intensity: 10,
    particles: 0,
    luminous: 4,
    stars: 0,
    mode: 'prism',
  },
  'Ice Prism': {
    preset: 'Prism Ice',
    symmetry: 7,
    complexity: 5,
    glow: 2,
    breathSpeed: 0.35,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'prism',
  },
  'Prism3D Core': {
    preset: 'Prism Void',
    symmetry: 8,
    complexity: 6,
    glow: 7,
    breathSpeed: 0.45,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'prism3d',
  },
  'Crystal Storm': {
    preset: 'Prism Forest',
    symmetry: 12,
    complexity: 7,
    glow: 1,
    breathSpeed: 0.7,
    intensity: 9,
    particles: 0,
    luminous: 4,
    stars: 0,
    mode: 'prism3d',
  },
  'Oil Film': {
    preset: 'Liquid Pearl',
    symmetry: 6,
    complexity: 8,
    glow: 10,
    breathSpeed: 0.5,
    intensity: 7,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'liquid',
  },
  'Soap Bubble': {
    preset: 'Liquid Pearl',
    symmetry: 12,
    complexity: 10,
    glow: 8,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'liquid',
  },
  'Living Tissue': {
    preset: 'Cell Biolum',
    symmetry: 6,
    complexity: 5,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 7,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'cells',
  },
  'Petri Bloom': {
    preset: 'Cell Biolum',
    symmetry: 8,
    complexity: 9,
    glow: 5,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'cells',
  },
  'Ocean Drift': {
    preset: 'Deep Current',
    symmetry: 4,
    complexity: 5,
    glow: 3,
    breathSpeed: 0.35,
    intensity: 7,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'current',
  },
  'Storm Spiral': {
    preset: 'Deep Current',
    symmetry: 8,
    complexity: 7,
    glow: 6,
    breathSpeed: 0.8,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'current',
  },
  'Current Scales': {
    preset: 'Deep Current',
    symmetry: 7,
    complexity: 7,
    glow: 4,
    breathSpeed: 0.45,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'currentscales',
  },
  'Cyclone Tiles': {
    preset: 'Deep Current',
    symmetry: 8,
    complexity: 6,
    glow: 5,
    breathSpeed: 0.55,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'cyclonetiles',
  },
  'Eddy Lace': {
    preset: 'Deep Current',
    symmetry: 5,
    complexity: 8,
    glow: 4,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'eddylace',
  },
  'Magnetic Sand': {
    preset: 'Golden Source',
    symmetry: 6,
    complexity: 8,
    glow: 3,
    breathSpeed: 0.1,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'magneticsand',
  },
  'Flow Field': {
    preset: 'Cosmic Indigo',
    symmetry: 12,
    complexity: 6,
    glow: 5,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 8,
    luminous: 3,
    stars: 3,
    mode: 'flowfield',
  },
  'Flow Walkers': {
    preset: 'Cosmic Indigo',
    symmetry: 12,
    complexity: 5,
    glow: 4,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 8,
    luminous: 3,
    stars: 2,
    mode: 'flowwalkers',
  },
  'Flow Sacred': {
    preset: 'Violet Portal',
    symmetry: 12,
    complexity: 6,
    glow: 6,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 8,
    luminous: 3,
    stars: 3,
    mode: 'flowsacred',
  },
  'Dance Walkers': {
    preset: 'Rose Quartz',
    symmetry: 12,
    complexity: 5,
    glow: 5,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 9,
    luminous: 3,
    stars: 2,
    mode: 'flowdance',
  },
  'Magnetic Sands 2': {
    preset: 'Amber Dust',
    symmetry: 14,
    complexity: 6,
    glow: 5,
    breathSpeed: 0.45,
    intensity: 8,
    particles: 9,
    luminous: 2.6,
    stars: 3,
    mode: 'flowsands',
  },
  'Golden Flow': {
    preset: 'Golden Source',
    symmetry: 12,
    complexity: 5,
    glow: 5,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 8,
    luminous: 3,
    stars: 3,
    mode: 'flowfield',
  },
  Butterfly: {
    preset: 'Rose Quartz',
    symmetry: 12,
    complexity: 5,
    glow: 5,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 9,
    luminous: 2.8,
    stars: 3,
    mode: 'flowbutterfly',
  },
  'Star Sand Lines': {
    preset: 'Cosmic Indigo',
    symmetry: 12,
    complexity: 4,
    glow: 5,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 9,
    luminous: 2.4,
    stars: 4,
    mode: 'flowlines',
  },
  Eclipse: {
    preset: 'Golden Source',
    symmetry: 9,
    complexity: 8.8,
    glow: 3.6,
    breathSpeed: 0.28,
    intensity: 8.6,
    particles: 0,
    luminous: 1.2,
    stars: 0,
    mode: 'eclipse',
  },
  'Yin Yang': {
    preset: 'Golden Source',
    symmetry: 8,
    complexity: 8.6,
    glow: 4.2,
    breathSpeed: 0.32,
    intensity: 8.4,
    particles: 0,
    luminous: 1.4,
    stars: 0,
    mode: 'yinyang',
  },
  Volcano: {
    preset: 'Deep Fire',
    symmetry: 8,
    complexity: 8.8,
    glow: 5,
    breathSpeed: 0.36,
    intensity: 9,
    particles: 0,
    luminous: 1.8,
    stars: 0,
    mode: 'volcano',
  },
  'Atomic Explosion': {
    preset: 'Golden Source',
    symmetry: 12,
    complexity: 8.8,
    glow: 5,
    breathSpeed: 0.3,
    intensity: 7,
    particles: 2,
    luminous: 2.8,
    stars: 5,
    mode: 'atomicexplosion',
  },
  Gravity: {
    preset: 'Golden Source',
    symmetry: 7,
    complexity: 8.2,
    glow: 4.1,
    breathSpeed: 0.32,
    intensity: 8.4,
    particles: 0,
    luminous: 2.4,
    stars: 0,
    mode: 'gravity',
  },
  Fire: {
    preset: 'Deep Fire',
    symmetry: 7,
    complexity: 7.6,
    glow: 6.2,
    breathSpeed: 0.42,
    intensity: 9,
    particles: 0,
    luminous: 2.7,
    stars: 0,
    mode: 'fire',
  },
  'Solar Flare': {
    preset: 'Solar Plasma',
    symmetry: 6,
    complexity: 6,
    glow: 8,
    breathSpeed: 0.7,
    intensity: 10,
    particles: 0,
    luminous: 4,
    stars: 0,
    mode: 'plasma',
  },
  'Plasma Field': {
    preset: 'Solar Plasma',
    symmetry: 4,
    complexity: 5,
    glow: 4,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'plasma',
  },
  'Nebula Veil': {
    preset: 'Violet Portal',
    symmetry: 4,
    complexity: 7,
    glow: 6,
    breathSpeed: 0.32,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 8,
    mode: 'nebula',
  },
  'Nebula Bloom': {
    preset: 'Deep Current',
    symmetry: 5,
    complexity: 8,
    glow: 7,
    breathSpeed: 0.38,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 9,
    mode: 'nebula',
  },
  'Dot Galaxy': {
    preset: 'Cosmic Indigo',
    symmetry: 2,
    complexity: 10,
    glow: 8,
    breathSpeed: 0.28,
    intensity: 9,
    particles: 0,
    luminous: 2,
    stars: 10,
    mode: 'nebula',
  },
  'Starflow Galaxy': {
    preset: 'Cosmic Indigo',
    symmetry: 3,
    complexity: 10,
    glow: 8,
    breathSpeed: 0.42,
    intensity: 9,
    particles: 0,
    luminous: 2,
    stars: 10,
    mode: 'nebula',
  },
  'Music Entropy': {
    preset: 'Blue Astral',
    symmetry: 9,
    complexity: 8,
    glow: 7,
    breathSpeed: 0.72,
    intensity: 8,
    particles: 5,
    luminous: 2,
    stars: 2,
    mode: 'musicdots',
  },
  'Music Nebula': {
    preset: 'Violet Portal',
    symmetry: 6,
    complexity: 9,
    glow: 8,
    breathSpeed: 0.58,
    intensity: 8,
    particles: 5,
    luminous: 2,
    stars: 6,
    mode: 'musicnebula',
  },
  'Groove Lattice': {
    preset: 'Golden Source',
    symmetry: 8,
    complexity: 7,
    glow: 6,
    breathSpeed: 0.85,
    intensity: 8,
    particles: 4,
    luminous: 2,
    stars: 1,
    mode: 'musiclattice',
  },
  'Emotion Globe': {
    preset: 'Terra Globe',
    symmetry: 8,
    complexity: 6,
    glow: 8,
    breathSpeed: 0.4,
    intensity: 7,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'globe',
  },
  'Storm Globe': {
    preset: 'Terra Globe',
    symmetry: 12,
    complexity: 8,
    glow: 5,
    breathSpeed: 0.7,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'globe',
  },
  // ── Yantra 3D colour variants ──
  'Yantra Prism': {
    preset: 'Yantra Fire',
    symmetry: 8,
    complexity: 6,
    glow: 10,
    breathSpeed: 0.18,
    intensity: 8,
    particles: 4,
    luminous: 1,
    stars: 0,
    mode: 'yantra3d',
  },
  'Yantra Colour': {
    preset: 'Fibonacci Bloom',
    symmetry: 12,
    complexity: 7,
    glow: 4,
    breathSpeed: 0.22,
    intensity: 6,
    particles: 5,
    luminous: 2,
    stars: 0,
    mode: 'yantra3d',
  },
  'Yantra Mono': {
    preset: 'Yantra Fire',
    symmetry: 6,
    complexity: 4,
    glow: 0,
    breathSpeed: 0.25,
    intensity: 8,
    particles: 3,
    luminous: 1,
    stars: 0,
    mode: 'yantra3d',
  },
  // ── Fibonacci 3D colour variants ──
  'Fibonacci Prism': {
    preset: 'Fibonacci Bloom',
    symmetry: 8,
    complexity: 5,
    glow: 10,
    breathSpeed: 0.2,
    intensity: 8,
    particles: 5,
    luminous: 1,
    stars: 0,
    mode: 'fibonacci3d',
  },
  'Fibonacci Colour': {
    preset: 'Fibonacci Bloom',
    symmetry: 6,
    complexity: 6,
    glow: 6,
    breathSpeed: 0.28,
    intensity: 7,
    particles: 4,
    luminous: 1,
    stars: 0,
    mode: 'fibonacci3d',
  },
  // ── Current 3D (3D curl flow) ──
  'Current 3D': {
    preset: 'Deep Current',
    symmetry: 5,
    complexity: 5,
    glow: 4,
    breathSpeed: 0.45,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'current3d',
  },
  'Vortex 3D': {
    preset: 'Solar Plasma',
    symmetry: 8,
    complexity: 7,
    glow: 9,
    breathSpeed: 0.7,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'current3d',
  },
  'Deep Flow 3D': {
    preset: 'Terra Globe',
    symmetry: 4,
    complexity: 4,
    glow: 2,
    breathSpeed: 0.3,
    intensity: 7,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'current3d',
  },
  'Nebula Drift': {
    preset: 'Clifford Dream',
    symmetry: 6,
    complexity: 6,
    glow: 8,
    breathSpeed: 0.35,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'current3d',
  },
  // ── Matrix rain (dot columns) ──
  'Matrix Rain': {
    preset: 'Matrix Green',
    symmetry: 4,
    complexity: 5,
    glow: 0,
    breathSpeed: 0.9,
    intensity: 8,
    particles: 0,
    luminous: 1,
    stars: 0,
    mode: 'matrix',
  },
  'Code Storm': {
    preset: 'Matrix Green',
    symmetry: 6,
    complexity: 8,
    glow: 0,
    breathSpeed: 1.4,
    intensity: 9,
    particles: 0,
    luminous: 1,
    stars: 0,
    mode: 'matrix',
  },
  'Neon Rain': {
    preset: 'Matrix Indigo',
    symmetry: 4,
    complexity: 6,
    glow: 10,
    breathSpeed: 0.7,
    intensity: 8,
    particles: 0,
    luminous: 1,
    stars: 0,
    mode: 'matrix',
  },
  'Matrix Gold': {
    preset: 'Matrix Gold',
    symmetry: 4,
    complexity: 6,
    glow: 4,
    breathSpeed: 0.45,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'matrix',
  },
  'Matrix Crimson': {
    preset: 'Matrix Crimson',
    symmetry: 4,
    complexity: 6,
    glow: 3,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'matrix',
  },
  'Matrix Arctic': {
    preset: 'Matrix Arctic',
    symmetry: 4,
    complexity: 6,
    glow: 5,
    breathSpeed: 0.42,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'matrix',
  },
  'Matrix Dream': {
    preset: 'Matrix Sacred',
    symmetry: 4,
    complexity: 6,
    glow: 6,
    breathSpeed: 0.38,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'matrix',
  },
  'Matrix 3D': {
    preset: 'Matrix Green',
    symmetry: 4,
    complexity: 7,
    glow: 4,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'matrix3d',
  },
  'Matrix 3D Indigo': {
    preset: 'Matrix Indigo',
    symmetry: 4,
    complexity: 7,
    glow: 6,
    breathSpeed: 0.45,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'matrix3d',
  },
  // ── Tibetan Tangka series ──
  'Tangka Mandala': {
    preset: 'Tangka Gold',
    symmetry: 16,
    complexity: 8,
    glow: 3,
    breathSpeed: 0.12,
    intensity: 8,
    particles: 6,
    luminous: 3,
    stars: 0,
    mode: 'yantra3d',
  },
  'Tangka Wheel': {
    preset: 'Tangka Crimson',
    symmetry: 8,
    complexity: 6,
    glow: 2,
    breathSpeed: 0.15,
    intensity: 9,
    particles: 5,
    luminous: 3,
    stars: 0,
    mode: 'sacred',
  },
  'Tangka Lotus': {
    preset: 'Tangka Gold',
    symmetry: 12,
    complexity: 7,
    glow: 4,
    breathSpeed: 0.1,
    intensity: 8,
    particles: 4,
    luminous: 4,
    stars: 0,
    mode: 'fibonacci3d',
  },
  'Tangka Sky': {
    preset: 'Tangka Lapis',
    symmetry: 10,
    complexity: 6,
    glow: 5,
    breathSpeed: 0.14,
    intensity: 7,
    particles: 5,
    luminous: 3,
    stars: 0,
    mode: 'fibonacci3d',
  },
  'Tangka Fire': {
    preset: 'Tangka Crimson',
    symmetry: 9,
    complexity: 5,
    glow: 6,
    breathSpeed: 0.2,
    intensity: 9,
    particles: 5,
    luminous: 4,
    stars: 0,
    mode: 'yantra3d',
  },
  // ── Atom 3D (quantum electron cloud) ──
  'Atom 3D': {
    preset: '4D Crystal',
    symmetry: 6,
    complexity: 5,
    glow: 8,
    breathSpeed: 0.55,
    intensity: 8,
    particles: 8,
    luminous: 2,
    stars: 0,
    mode: 'fibonacci3d',
  },
  'Orbital Atom': {
    preset: 'Orbital Shell',
    symmetry: 4,
    complexity: 3,
    glow: 5,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 3,
    luminous: 2,
    stars: 0,
    mode: 'current3d',
  },
  // ── Aurora Globe variants ──
  'Aurora Globe': {
    preset: 'Terra Globe',
    symmetry: 6,
    complexity: 7,
    glow: 10,
    breathSpeed: 0.28,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'globe',
  },
  'Crystal Globe': {
    preset: 'Liquid Pearl',
    symmetry: 10,
    complexity: 8,
    glow: 8,
    breathSpeed: 0.22,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'globe',
  },
  // ── Pulse / Rorschach series ──
  'Rorschach Pulse': {
    preset: 'Calm Field',
    symmetry: 8,
    complexity: 6,
    glow: 0,
    breathSpeed: 0.2,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'pulse',
  },
  'Rorschach Colour': {
    preset: 'Fibonacci Bloom',
    symmetry: 8,
    complexity: 7,
    glow: 9,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'pulse',
  },
  'Ink Pulse': {
    preset: 'Calm Field',
    symmetry: 3,
    complexity: 8,
    glow: 0,
    breathSpeed: 0.32,
    intensity: 9,
    particles: 0,
    luminous: 4,
    stars: 0,
    mode: 'pulse',
  },
  'Chaos Pulse': {
    preset: 'DMT Vision',
    symmetry: 8,
    complexity: 10,
    glow: 0,
    breathSpeed: 0.22,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'pulse',
  },
  'Slow Breath': {
    preset: 'Prism Warm',
    symmetry: 6,
    complexity: 2,
    glow: 3,
    breathSpeed: 0.18,
    intensity: 7,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'pulse',
  },
  // ── Chaos & Randomness series ──
  'Chaos Field': {
    preset: 'Deep Current',
    symmetry: 8,
    complexity: 9,
    glow: 8,
    breathSpeed: 1.6,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'current',
  },
  'Chaos Storm 3D': {
    preset: 'Solar Plasma',
    symmetry: 9,
    complexity: 8,
    glow: 10,
    breathSpeed: 1.8,
    intensity: 10,
    particles: 0,
    luminous: 4,
    stars: 0,
    mode: 'current3d',
  },
  Entropy: {
    preset: 'Cell Biolum',
    symmetry: 12,
    complexity: 9,
    glow: 9,
    breathSpeed: 1.4,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'cells',
  },
  'Random Burst': {
    preset: 'DMT Vision',
    symmetry: 24,
    complexity: 10,
    glow: 6,
    breathSpeed: 1.5,
    intensity: 6,
    particles: 6,
    luminous: 3,
    stars: 3,
    mode: 'burst',
  },
  'Quantum Chaos': {
    preset: 'Clifford Dream',
    symmetry: 7,
    complexity: 8,
    glow: 9,
    breathSpeed: 1.2,
    intensity: 9,
    particles: 0,
    luminous: 4,
    stars: 0,
    mode: 'current3d',
  },
  'Emotion Field': {
    preset: 'Calm Field',
    symmetry: 6,
    complexity: 7,
    glow: 8,
    breathSpeed: 0.9,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 2,
    mode: 'emotion',
  },
  'Emotion Storm': {
    preset: 'Deep Fire',
    symmetry: 4,
    complexity: 10,
    glow: 10,
    breathSpeed: 1.8,
    intensity: 9,
    particles: 0,
    luminous: 5,
    stars: 1,
    mode: 'emotion',
  },
  'Star Map': {
    preset: 'Blue Astral',
    symmetry: 6,
    complexity: 7,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 7,
    particles: 0,
    luminous: 3,
    stars: 5,
    mode: 'constellation',
  },
  'Constellation Gold': {
    preset: 'Calm Field',
    symmetry: 8,
    complexity: 8,
    glow: 6,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 3,
    mode: 'constellation',
  },
  'Breath Gold': {
    preset: 'Calm Field',
    symmetry: 8,
    complexity: 8,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 2,
    mode: 'breath',
  },
  'Breath Indigo': {
    preset: 'Cosmic Indigo',
    symmetry: 8,
    complexity: 8,
    glow: 8,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 3,
    mode: 'breath',
  },
  'Breath Forest': {
    preset: 'Forest Ceremony',
    symmetry: 8,
    complexity: 9,
    glow: 7,
    breathSpeed: 0.45,
    intensity: 9,
    particles: 0,
    luminous: 2,
    stars: 2,
    mode: 'breath',
  },
  'Stream Gold': {
    preset: 'Calm Field',
    symmetry: 8,
    complexity: 9,
    glow: 6,
    breathSpeed: 0.6,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 2,
    mode: 'stream',
  },
  'Stream Astral': {
    preset: 'Blue Astral',
    symmetry: 8,
    complexity: 9,
    glow: 7,
    breathSpeed: 0.7,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 3,
    mode: 'stream',
  },
  'Stream Violet': {
    preset: 'Violet Portal',
    symmetry: 8,
    complexity: 9,
    glow: 8,
    breathSpeed: 0.6,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 2,
    mode: 'stream',
  },
  'Entropy Gold': {
    preset: 'Calm Field',
    symmetry: 8,
    complexity: 8,
    glow: 6,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'entropy',
  },
  'Entropy Dark': {
    preset: 'Cosmic Indigo',
    symmetry: 8,
    complexity: 9,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 9,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'entropy',
  },
  'Entropy 3D': {
    preset: 'Cosmic Indigo',
    symmetry: 6,
    complexity: 7,
    glow: 7,
    breathSpeed: 0.55,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'entropy3d',
  },
  'Entropy 3D Indigo': {
    preset: 'Cosmic Indigo',
    symmetry: 8,
    complexity: 9,
    glow: 7,
    breathSpeed: 0.55,
    intensity: 9,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'entropy3d',
  },
  'Soul Map': {
    preset: 'Violet Portal',
    symmetry: 8,
    complexity: 10,
    glow: 9,
    breathSpeed: 0.5,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 3,
    mode: 'cbloom',
  },
  'Mind Current': {
    preset: 'Blue Astral',
    symmetry: 7,
    complexity: 9,
    glow: 8,
    breathSpeed: 0.45,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 2,
    mode: 'lorenz3d',
  },
  'Body Flow': {
    preset: 'Forest Ceremony',
    symmetry: 6,
    complexity: 8,
    glow: 6,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 1,
    mode: 'weave',
  },
  'Focus Arc': {
    preset: 'Golden Source',
    symmetry: 3,
    complexity: 7,
    glow: 8,
    breathSpeed: 0.55,
    intensity: 9,
    particles: 4,
    luminous: 3,
    stars: 2,
    mode: 'tknot3d',
  },
  'Inner Temple': {
    preset: 'Sacred Architecture',
    symmetry: 8,
    complexity: 9,
    glow: 7,
    breathSpeed: 0.45,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 3,
    mode: 'orbit',
  },
  'EMBF Live': {
    preset: 'Calm Field',
    symmetry: 6,
    complexity: 6,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'embf3d',
  },
  'EMBF Cosmos': {
    preset: 'Cosmic Indigo',
    symmetry: 6,
    complexity: 7,
    glow: 8,
    breathSpeed: 0.45,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 2,
    mode: 'embf3d',
  },
  'EMBF Forest': {
    preset: 'Forest Ceremony',
    symmetry: 6,
    complexity: 6,
    glow: 6,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 1,
    mode: 'embf3d',
  },
  'EMBF Storm': {
    preset: 'Blue Astral',
    symmetry: 7,
    complexity: 8,
    glow: 8,
    breathSpeed: 0.55,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 3,
    mode: 'embf3d',
  },
  'Drift Field': {
    preset: 'Blue Astral',
    symmetry: 7,
    complexity: 9,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 3,
    mode: 'drift',
  },
  'Drift Gold': {
    preset: 'Calm Field',
    symmetry: 6,
    complexity: 8,
    glow: 6,
    breathSpeed: 0.4,
    intensity: 7,
    particles: 0,
    luminous: 2,
    stars: 2,
    mode: 'drift',
  },
  'Bloom Evo': {
    preset: 'Violet Portal',
    symmetry: 8,
    complexity: 10,
    glow: 9,
    breathSpeed: 0.6,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 3,
    mode: 'cbloom',
  },
  'Bloom Gold': {
    preset: 'Fibonacci Bloom',
    symmetry: 7,
    complexity: 9,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 2,
    mode: 'cbloom',
  },
  'Orbit EMBF': {
    preset: 'Forest Ceremony',
    symmetry: 8,
    complexity: 10,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 3,
    mode: 'orbit',
  },
  'Orbit Indigo': {
    preset: 'Cosmic Indigo',
    symmetry: 8,
    complexity: 9,
    glow: 8,
    breathSpeed: 0.4,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 3,
    mode: 'orbit',
  },
  'Weave Silk': {
    preset: 'DMT Vision',
    symmetry: 8,
    complexity: 10,
    glow: 8,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 3,
    stars: 3,
    mode: 'weave',
  },
  'Weave Crystal': {
    preset: '4D Crystal',
    symmetry: 7,
    complexity: 9,
    glow: 7,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 2,
    mode: 'weave',
  },
  'Chaos Triangles': {
    preset: 'Deep Current',
    symmetry: 8,
    complexity: 9,
    glow: 8,
    breathSpeed: 1.4,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 0,
    mode: 'chaostri3d',
  },
  'Chaos Tri Sphere': {
    preset: 'Blue Astral',
    symmetry: 9,
    complexity: 7.4,
    glow: 7.2,
    breathSpeed: 0.86,
    intensity: 8,
    particles: 0,
    luminous: 2.5,
    stars: 2,
    mode: 'chaostrisphere',
  },
  'Chaos Tri Gold': {
    preset: 'Calm Field',
    symmetry: 7,
    complexity: 8,
    glow: 7,
    breathSpeed: 1.0,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 0,
    mode: 'chaostri3d',
  },
  'Tree of Life': {
    preset: 'Forest Ceremony',
    symmetry: 8,
    complexity: 8,
    glow: 6,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 2,
    mode: 'treeoflife',
  },
  'Tree Gold': {
    preset: 'Calm Field',
    symmetry: 8,
    complexity: 8,
    glow: 6,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 2,
    mode: 'treeoflife',
  },
  'Tree Violet': {
    preset: 'Violet Portal',
    symmetry: 8,
    complexity: 9,
    glow: 8,
    breathSpeed: 0.5,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 3,
    mode: 'treeoflife',
  },
  'Tree 3D Gold': {
    preset: 'Calm Field',
    symmetry: 8,
    complexity: 8,
    glow: 7,
    breathSpeed: 0.4,
    intensity: 8,
    particles: 0,
    luminous: 2,
    stars: 3,
    mode: 'treeoflife3d',
  },
  'Tree 3D Indigo': {
    preset: 'Cosmic Indigo',
    symmetry: 8,
    complexity: 9,
    glow: 8,
    breathSpeed: 0.5,
    intensity: 9,
    particles: 0,
    luminous: 3,
    stars: 3,
    mode: 'treeoflife3d',
  },
  Metamorph: {
    preset: 'Forest Ceremony',
    symmetry: 6,
    complexity: 5,
    glow: 7,
    breathSpeed: 0.7,
    intensity: 8,
    particles: 3,
    luminous: 2,
    stars: 2,
    mode: 'metamorph',
  },
  Chrysalis: {
    preset: 'Violet Portal',
    symmetry: 6,
    complexity: 7,
    glow: 8,
    breathSpeed: 0.5,
    intensity: 9,
    particles: 3,
    luminous: 2,
    stars: 2,
    mode: 'chrysalis',
  },
  'Chrysalis Rings': {
    preset: 'Golden Source',
    symmetry: 3,
    complexity: 6,
    glow: 7,
    breathSpeed: 0.45,
    intensity: 8,
    particles: 3,
    luminous: 1.7,
    stars: 1,
    mode: 'chrysalisrings',
  },
  Breathform: {
    preset: 'Golden Source',
    symmetry: 5,
    complexity: 6,
    glow: 6,
    breathSpeed: 0.6,
    intensity: 8,
    particles: 3,
    luminous: 2,
    stars: 1,
    mode: 'breathform',
  },
  'Neon Word': {
    preset: 'Warp Tunnel',
    symmetry: 6,
    complexity: 5,
    glow: 9,
    breathSpeed: 1.2,
    intensity: 9,
    particles: 3,
    luminous: 2,
    stars: 1,
    mode: 'wordneon',
  },
  Duality: {
    preset: 'Blue Astral',
    symmetry: 4,
    complexity: 4,
    glow: 7,
    breathSpeed: 0.6,
    intensity: 8,
    particles: 2,
    luminous: 1,
    stars: 2,
    mode: 'hopefear',
  },
  'Echo Word': {
    preset: 'Violet Portal',
    symmetry: 5,
    complexity: 8,
    glow: 6,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 3,
    luminous: 1,
    stars: 2,
    mode: 'wordecho',
  },
  'Particle Word': {
    preset: 'Golden Source',
    symmetry: 6,
    complexity: 9,
    glow: 5,
    breathSpeed: 0.8,
    intensity: 7,
    particles: 5,
    luminous: 1,
    stars: 1,
    mode: 'wordparticle',
  },
  'Woven Word': {
    preset: 'Forest Ceremony',
    symmetry: 4,
    complexity: 7,
    glow: 7,
    breathSpeed: 0.7,
    intensity: 8,
    particles: 3,
    luminous: 1,
    stars: 2,
    mode: 'wordweave',
  },
  Scriptures: {
    preset: 'Golden Source',
    symmetry: 8,
    complexity: 8.5,
    glow: 4.2,
    breathSpeed: 0.32,
    intensity: 8.8,
    particles: 0,
    luminous: 2.6,
    stars: 0,
    mode: 'scriptures',
  },
  'Vertical Scriptures': {
    preset: 'Golden Source',
    symmetry: 7,
    complexity: 8.2,
    glow: 4,
    breathSpeed: 0.28,
    intensity: 8.4,
    particles: 0,
    luminous: 2.4,
    stars: 0,
    mode: 'scripturesjp',
  },
  'Clock of Infinity': {
    preset: 'Warp Tunnel',
    symmetry: 7,
    complexity: 7,
    glow: 8,
    breathSpeed: 0.8,
    intensity: 8,
    particles: 2,
    luminous: 2,
    stars: 2,
    mode: 'clock3d',
  },
  'Eternal Clock': {
    preset: 'Cosmic Indigo',
    symmetry: 7,
    complexity: 8,
    glow: 7,
    breathSpeed: 0.5,
    intensity: 7,
    particles: 2,
    luminous: 2,
    stars: 3,
    mode: 'clock3d',
  },
  'Golden Clock': {
    preset: 'Golden Source',
    symmetry: 7,
    complexity: 6,
    glow: 9,
    breathSpeed: 1.0,
    intensity: 9,
    particles: 2,
    luminous: 3,
    stars: 2,
    mode: 'clock3d',
  },
  'Cosmic Astrolabe': {
    preset: 'Blue Astral',
    symmetry: 7,
    complexity: 9,
    glow: 8,
    breathSpeed: 0.6,
    intensity: 8,
    particles: 3,
    luminous: 2,
    stars: 3,
    mode: 'clock3d',
  },
  'Atom Light': {
    preset: 'Warp Tunnel',
    symmetry: 4,
    complexity: 5,
    glow: 8,
    breathSpeed: 1.2,
    intensity: 8,
    particles: 2,
    luminous: 2,
    stars: 2,
    mode: 'atomlight',
  },
  'Neon Atom': {
    preset: 'Violet Portal',
    symmetry: 4,
    complexity: 6,
    glow: 9,
    breathSpeed: 1.6,
    intensity: 9,
    particles: 3,
    luminous: 3,
    stars: 1,
    mode: 'atomlight',
  },
  'Duality Wings': {
    preset: 'DMT Vision',
    symmetry: 5,
    complexity: 6,
    glow: 8,
    breathSpeed: 0.9,
    intensity: 8,
    particles: 2,
    luminous: 2,
    stars: 2,
    mode: 'butterfly',
  },
  'Sacred Pyramid': {
    preset: 'Golden Source',
    symmetry: 4,
    complexity: 6,
    glow: 8,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 3,
    luminous: 2,
    stars: 2,
    mode: 'pyramid3d',
  },
  Merkaba: {
    preset: 'Cosmic Indigo',
    symmetry: 6,
    complexity: 7,
    glow: 9,
    breathSpeed: 0.4,
    intensity: 9,
    particles: 3,
    luminous: 3,
    stars: 3,
    mode: 'pyramid3d',
  },
  'Orbital Dance': {
    preset: 'Blue Astral',
    symmetry: 6,
    complexity: 6,
    glow: 7,
    breathSpeed: 1.0,
    intensity: 8,
    particles: 3,
    luminous: 2,
    stars: 2,
    mode: 'orbitdance',
  },
  'Ellipse Ballet': {
    preset: 'Violet Portal',
    symmetry: 6,
    complexity: 7,
    glow: 8,
    breathSpeed: 0.8,
    intensity: 8,
    particles: 2,
    luminous: 2,
    stars: 2,
    mode: 'orbitdance',
  },
  'Ripple Morph': {
    preset: 'DMT Vision',
    symmetry: 6,
    complexity: 8,
    glow: 7,
    breathSpeed: 1.1,
    intensity: 8,
    particles: 2,
    luminous: 1,
    stars: 1,
    mode: 'ripplemorph',
  },
  'Psychedelic Bloom': {
    preset: 'Cosmic Indigo',
    symmetry: 8,
    complexity: 9,
    glow: 9,
    breathSpeed: 0.9,
    intensity: 9,
    particles: 3,
    luminous: 2,
    stars: 2,
    mode: 'ripplemorph',
  },
  'Kaleido Storm': {
    preset: 'Warp Tunnel',
    symmetry: 8,
    complexity: 7,
    glow: 8,
    breathSpeed: 1.0,
    intensity: 8,
    particles: 2,
    luminous: 2,
    stars: 2,
    mode: 'kaleido3d',
  },
  'Rainbow Gate': {
    preset: 'DMT Vision',
    symmetry: 6,
    complexity: 8,
    glow: 9,
    breathSpeed: 0.8,
    intensity: 9,
    particles: 3,
    luminous: 3,
    stars: 2,
    mode: 'kaleido3d',
  },
  'Clock Orbit': {
    preset: 'Warp Tunnel',
    symmetry: 7,
    complexity: 7,
    glow: 8,
    breathSpeed: 0.9,
    intensity: 8,
    particles: 2,
    luminous: 3,
    stars: 3,
    mode: 'clockorbit3d',
  },
  'Armillary Gold': {
    preset: 'Golden Source',
    symmetry: 7,
    complexity: 8,
    glow: 9,
    breathSpeed: 0.7,
    intensity: 9,
    particles: 2,
    luminous: 3,
    stars: 3,
    mode: 'clockorbit3d',
  },
  'Celestial Spheres': {
    preset: 'Violet Portal',
    symmetry: 7,
    complexity: 7,
    glow: 8,
    breathSpeed: 0.6,
    intensity: 8,
    particles: 3,
    luminous: 3,
    stars: 3,
    mode: 'clockorbit3d',
  },
  'Astrolabe Deep': {
    preset: 'Blue Astral',
    symmetry: 7,
    complexity: 9,
    glow: 9,
    breathSpeed: 0.5,
    intensity: 9,
    particles: 3,
    luminous: 4,
    stars: 4,
    mode: 'clockorbit3d',
  },
  'Mirror Tunnel': {
    preset: 'Warp Tunnel',
    symmetry: 5,
    complexity: 9,
    glow: 9,
    breathSpeed: 0.9,
    intensity: 9,
    particles: 2,
    luminous: 3,
    stars: 3,
    mode: 'mirrortunnel',
  },
  'Neon Abyss': {
    preset: 'Cosmic Indigo',
    symmetry: 6,
    complexity: 10,
    glow: 10,
    breathSpeed: 0.7,
    intensity: 9,
    particles: 2,
    luminous: 3,
    stars: 3,
    mode: 'mirrortunnel',
  },
  'Infinite Dive': {
    preset: 'Blue Astral',
    symmetry: 6,
    complexity: 9,
    glow: 8,
    breathSpeed: 1.0,
    intensity: 8,
    particles: 2,
    luminous: 2,
    stars: 2,
    mode: 'infinitedive',
  },
  'Golden Vortex': {
    preset: 'Golden Source',
    symmetry: 8,
    complexity: 9,
    glow: 8,
    breathSpeed: 0.8,
    intensity: 9,
    particles: 2,
    luminous: 2,
    stars: 2,
    mode: 'infinitedive',
  },
  'Heart Wave': {
    preset: 'Violet Portal',
    symmetry: 4,
    complexity: 5,
    glow: 7,
    breathSpeed: 1.4,
    intensity: 8,
    particles: 2,
    luminous: 2,
    stars: 1,
    mode: 'heartwave',
  },
  'Eye Storm': {
    preset: 'Calm Field',
    symmetry: 4,
    complexity: 6,
    glow: 6,
    breathSpeed: 0.6,
    intensity: 7,
    particles: 2,
    luminous: 1,
    stars: 2,
    mode: 'eyemorph',
  },
  'Sin Morph': {
    preset: 'Forest Ceremony',
    symmetry: 6,
    complexity: 5.8,
    glow: 5.4,
    breathSpeed: 0.16,
    intensity: 6.2,
    particles: 3,
    luminous: 1.4,
    stars: 1,
    mode: 'sinmorph3d',
  },
  'Sacred Sin Morph': {
    preset: 'Golden Source',
    symmetry: 8,
    complexity: 5.9,
    glow: 5.3,
    breathSpeed: 0.14,
    intensity: 6.1,
    particles: 3,
    luminous: 1.4,
    stars: 1,
    mode: 'sinmorph3d',
  },
  'Chaos Sin Morph': {
    preset: 'Cosmic Indigo',
    symmetry: 7,
    complexity: 7.4,
    glow: 5.8,
    breathSpeed: 0.18,
    intensity: 6.8,
    particles: 4,
    luminous: 1.7,
    stars: 2,
    mode: 'sinmorph3d',
  },
  'Alien Form': {
    preset: 'Cosmic Indigo',
    symmetry: 6,
    complexity: 9,
    glow: 8,
    breathSpeed: 0.6,
    intensity: 9,
    particles: 3,
    luminous: 3,
    stars: 2,
    mode: 'sinmorph3d',
  },
};

/* ── Journey system ─────────────────────────────────────────── */

interface JourneyStage {
  name: string;
  preset: string;
  mode: Mode;
  duration: number;
  symmetry?: number;
  complexity?: number;
  glow?: number;
  breathSpeed?: number;
  intensity?: number;
  particles?: number;
  luminous?: number;
  stars?: number;
}

interface Journey {
  id: number;
  name: string;
  icon: string;
  desc: string;
  stages: JourneyStage[];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function journeyLerpCfg(a: JourneyStage, b: JourneyStage, t: number, tint?: string): Cfg {
  const pa = PRESETS[a.preset] ?? PRESETS['Calm Field'];
  const pb = PRESETS[b.preset] ?? PRESETS['Calm Field'];
  const st = smoothstep(Math.max(0, Math.min(1, t)));
  const preset = tint ?? (t < 0.5 ? a.preset : b.preset);
  return {
    preset,
    mode: t < 0.5 ? a.mode : b.mode,
    symmetry: Math.round(lerp(a.symmetry ?? pa.symmetry, b.symmetry ?? pb.symmetry, st)),
    complexity: lerp(a.complexity ?? pa.complexity, b.complexity ?? pb.complexity, st),
    glow: lerp(a.glow ?? pa.glow, b.glow ?? pb.glow, st),
    breathSpeed: lerp(a.breathSpeed ?? pa.breathSpeed, b.breathSpeed ?? pb.breathSpeed, st),
    intensity: lerp(a.intensity ?? pa.intensity, b.intensity ?? pb.intensity, st),
    particles: lerp(a.particles ?? pa.particles, b.particles ?? pb.particles, st),
    luminous: lerp(a.luminous ?? pa.luminous, b.luminous ?? pb.luminous, st),
    stars: lerp(a.stars ?? pa.stars, b.stars ?? pb.stars, st),
  };
}

export const JOURNEYS: Journey[] = [
  {
    id: 1,
    name: 'Bloom',
    icon: '✿',
    desc: 'Flowers, Fibonacci spirals, infinite petals — slow golden growth',
    stages: [
      {
        name: 'Fibonacci Seed',
        preset: 'Fibonacci Bloom',
        mode: 'fibonacci',
        duration: 45,
        breathSpeed: 0.18,
        luminous: 2,
        stars: 1,
        complexity: 6,
      },
      {
        name: 'Petals Unfurl',
        preset: 'Calm Field',
        mode: 'sacred',
        duration: 45,
        symmetry: 12,
        breathSpeed: 0.15,
        luminous: 2,
        particles: 4,
        glow: 5,
      },
      {
        name: 'Kaleidoscope Bloom',
        preset: 'Golden Source',
        mode: 'kaleidoscope',
        duration: 40,
        symmetry: 16,
        breathSpeed: 0.22,
        luminous: 2,
        glow: 6,
      },
      {
        name: 'Burst of Life',
        preset: 'Fibonacci Bloom',
        mode: 'burst',
        duration: 35,
        breathSpeed: 0.3,
        luminous: 3,
        particles: 6,
        glow: 7,
      },
      {
        name: 'Orbital Garden',
        preset: 'Calm Field',
        mode: 'orbital',
        duration: 40,
        breathSpeed: 0.12,
        luminous: 2,
        stars: 2,
        symmetry: 8,
      },
    ],
  },
  {
    id: 2,
    name: 'Space Tunnel',
    icon: '⊙',
    desc: 'Stars, vortex tunnels, DMT depth — travelling through space',
    stages: [
      {
        name: 'Hyperspace Jump',
        preset: 'Warp Drive',
        mode: 'warp',
        duration: 40,
        breathSpeed: 0.6,
        luminous: 3,
        stars: 9,
        glow: 6,
      },
      {
        name: 'Vortex Descent',
        preset: 'Warp Tunnel',
        mode: 'tunnel',
        duration: 45,
        breathSpeed: 0.7,
        luminous: 3,
        stars: 7,
        glow: 5,
      },
      {
        name: 'Lorenz Attractor',
        preset: 'Cosmic Indigo',
        mode: 'lorenz',
        duration: 40,
        breathSpeed: 0.3,
        luminous: 3,
        stars: 5,
      },
      {
        name: 'Wave Interference',
        preset: 'Blue Astral',
        mode: 'lissajous',
        duration: 35,
        breathSpeed: 0.45,
        luminous: 3,
        stars: 7,
      },
      {
        name: 'Deep Tunnel',
        preset: 'Warp Tunnel',
        mode: 'tunnel',
        duration: 40,
        breathSpeed: 0.8,
        luminous: 4,
        stars: 9,
        glow: 7,
      },
    ],
  },
  {
    id: 3,
    name: 'Sacred Geometry',
    icon: '⬡',
    desc: '4D crystal forms, torus knots, platonic solids transforming',
    stages: [
      {
        name: 'Crystal Lattice',
        preset: 'Crystal Lattice',
        mode: 'geodesic',
        duration: 45,
        complexity: 5,
        breathSpeed: 0.18,
        luminous: 2,
        glow: 6,
      },
      {
        name: 'Hypercube Fold',
        preset: '4D Crystal',
        mode: 'hypercube',
        duration: 45,
        breathSpeed: 0.25,
        luminous: 3,
        glow: 7,
        complexity: 8,
      },
      {
        name: 'Torus Braid',
        preset: 'Knot Garden',
        mode: 'knot',
        duration: 40,
        breathSpeed: 0.22,
        luminous: 2,
        complexity: 5,
        symmetry: 3,
      },
      {
        name: 'Vitral Window',
        preset: 'Sacred Vitral',
        mode: 'vitral',
        duration: 40,
        breathSpeed: 0.15,
        luminous: 2,
        symmetry: 12,
      },
      {
        name: 'Orbital Shell',
        preset: 'Orbital Shell',
        mode: 'orbital',
        duration: 40,
        breathSpeed: 0.18,
        luminous: 2,
        symmetry: 6,
      },
    ],
  },
  {
    id: 4,
    name: 'Big Bang',
    icon: '✦',
    desc: 'Atoms to galaxies — the full spectrum of cosmic creation in colour',
    stages: [
      {
        name: 'Singularity',
        preset: 'Violet Portal',
        mode: 'burst',
        duration: 35,
        breathSpeed: 0.5,
        luminous: 4,
        particles: 8,
        glow: 8,
        stars: 2,
      },
      {
        name: 'Chaos Expansion',
        preset: 'Clifford Dream',
        mode: 'clifford',
        duration: 40,
        breathSpeed: 0.3,
        luminous: 3,
        complexity: 8,
        glow: 6,
      },
      {
        name: 'Stellar Birth',
        preset: 'Forest Ceremony',
        mode: 'golden',
        duration: 40,
        breathSpeed: 0.22,
        luminous: 2,
        stars: 5,
        symmetry: 10,
      },
      {
        name: 'Galaxy Formation',
        preset: 'Cosmic Indigo',
        mode: 'kaleidoscope',
        duration: 40,
        symmetry: 14,
        breathSpeed: 0.4,
        luminous: 3,
        stars: 6,
        glow: 7,
      },
      {
        name: 'Cosmic Drift',
        preset: 'Warp Drive',
        mode: 'warp',
        duration: 35,
        breathSpeed: 0.55,
        luminous: 4,
        stars: 9,
        glow: 7,
      },
    ],
  },
  {
    id: 5,
    name: 'Matrix',
    icon: '⌗',
    desc: 'Code rain morphing into blooming mandalas — data becomes nature',
    stages: [
      {
        name: 'Code Rain',
        preset: 'Matrix',
        mode: 'sacred',
        duration: 40,
        symmetry: 6,
        breathSpeed: 0.12,
        luminous: 2,
        stars: 0,
        particles: 1,
      },
      {
        name: 'Data Fibonacci',
        preset: 'Matrix',
        mode: 'fibonacci',
        duration: 40,
        breathSpeed: 0.15,
        luminous: 2,
        stars: 0,
        complexity: 7,
      },
      {
        name: 'System Kaleidoscope',
        preset: 'Matrix',
        mode: 'kaleidoscope',
        duration: 35,
        symmetry: 12,
        breathSpeed: 0.18,
        luminous: 2,
        glow: 5,
      },
      {
        name: 'Buffer Overflow',
        preset: 'Matrix',
        mode: 'burst',
        duration: 30,
        breathSpeed: 0.22,
        luminous: 3,
        particles: 5,
        glow: 6,
      },
      {
        name: 'Deep Mandala',
        preset: 'Matrix',
        mode: 'sacred',
        duration: 35,
        symmetry: 16,
        breathSpeed: 0.1,
        luminous: 2,
        particles: 2,
      },
    ],
  },
  {
    id: 6,
    name: 'Sacred Architecture',
    icon: '⛪',
    desc: 'Islamic arches, Gothic rose windows, yantra — sacred geometry across all human cultures',
    stages: [
      {
        name: 'Islamic Courtyard',
        preset: 'Islamic Garden',
        mode: 'islamic',
        duration: 50,
        symmetry: 12,
        complexity: 5,
        breathSpeed: 0.12,
        luminous: 2,
        glow: 4,
        stars: 1,
      },
      {
        name: 'Vitral Windows',
        preset: 'Sacred Vitral',
        mode: 'vitral',
        duration: 45,
        symmetry: 12,
        breathSpeed: 0.1,
        luminous: 2,
        glow: 3,
      },
      {
        name: 'Gothic Cathedral',
        preset: 'Sacred Architecture',
        mode: 'cathedral',
        duration: 50,
        symmetry: 10,
        complexity: 6,
        breathSpeed: 0.14,
        luminous: 3,
        glow: 7,
      },
      {
        name: 'Hindu Yantra',
        preset: 'Yantra Fire',
        mode: 'yantra',
        duration: 45,
        symmetry: 9,
        complexity: 5,
        breathSpeed: 0.12,
        luminous: 2,
        glow: 5,
      },
      {
        name: 'Celtic Weave',
        preset: 'Celtic Forest',
        mode: 'celtic',
        duration: 40,
        symmetry: 6,
        complexity: 3,
        breathSpeed: 0.15,
        luminous: 2,
        glow: 4,
      },
      {
        name: 'Rainbow Convergence',
        preset: 'Sacred Architecture',
        mode: 'rainbow',
        duration: 50,
        symmetry: 16,
        complexity: 8,
        breathSpeed: 0.18,
        luminous: 3,
        glow: 9,
      },
    ],
  },
  {
    id: 7,
    name: 'Fibonacci Mandala',
    icon: 'φ',
    desc: 'Infinite bloom — slow, meditative, eternal mathematical growth. ~10 min ambient loop.',
    stages: [
      {
        name: 'Primordial Seed',
        preset: 'Fibonacci Bloom',
        mode: 'fibonacci',
        duration: 90,
        breathSpeed: 0.08,
        luminous: 1,
        stars: 1,
        complexity: 4,
        glow: 4,
      },
      {
        name: 'First Petals',
        preset: 'Calm Field',
        mode: 'sacred',
        duration: 120,
        symmetry: 8,
        breathSpeed: 0.07,
        luminous: 1,
        particles: 3,
        glow: 5,
      },
      {
        name: 'Golden Proportion',
        preset: 'Golden Source',
        mode: 'golden',
        duration: 120,
        symmetry: 12,
        breathSpeed: 0.09,
        luminous: 2,
        glow: 5,
        stars: 2,
      },
      {
        name: 'Infinite Garden',
        preset: 'Fibonacci Bloom',
        mode: 'kaleidoscope',
        duration: 120,
        symmetry: 16,
        breathSpeed: 0.1,
        luminous: 2,
        glow: 6,
      },
      {
        name: 'Orbital Meditation',
        preset: 'Calm Field',
        mode: 'orbital',
        duration: 120,
        breathSpeed: 0.06,
        luminous: 1,
        stars: 3,
        symmetry: 8,
      },
      {
        name: 'Return to Source',
        preset: 'Fibonacci Bloom',
        mode: 'fibonacci',
        duration: 60,
        breathSpeed: 0.07,
        luminous: 1,
        stars: 1,
        complexity: 6,
      },
    ],
  },
  {
    id: 8,
    name: 'Fire & Earth',
    icon: '🔥',
    desc: 'Tectonic forces, lava flows, plasma storms — primal earth energy',
    stages: [
      {
        name: 'Tectonic Awakening',
        preset: 'Golden Source',
        mode: 'burst',
        duration: 35,
        breathSpeed: 0.45,
        luminous: 4,
        particles: 7,
        glow: 8,
        stars: 1,
      },
      {
        name: 'Lava Flow',
        preset: 'DMT Vision',
        mode: 'clifford',
        duration: 40,
        breathSpeed: 0.28,
        luminous: 3,
        complexity: 7,
        glow: 6,
      },
      {
        name: 'Storm Attractor',
        preset: 'Lorenz Storm',
        mode: 'lorenz',
        duration: 40,
        breathSpeed: 0.35,
        luminous: 3,
        stars: 3,
        complexity: 5,
      },
      {
        name: 'Core Plasma',
        preset: 'Golden Source',
        mode: 'warp',
        duration: 35,
        breathSpeed: 0.5,
        luminous: 4,
        stars: 5,
        glow: 7,
      },
      {
        name: 'Phoenix Flame',
        preset: 'DMT Vision',
        mode: 'burst',
        duration: 30,
        breathSpeed: 0.55,
        luminous: 4,
        particles: 8,
        glow: 9,
      },
    ],
  },
  {
    id: 9,
    name: 'Ocean Depths',
    icon: '🌊',
    desc: 'Bioluminescence, thermoclines, abyssal vortices — deep blue meditation',
    stages: [
      {
        name: 'Surface Ripples',
        preset: 'Blue Astral',
        mode: 'warp',
        duration: 40,
        breathSpeed: 0.25,
        luminous: 2,
        stars: 6,
        glow: 4,
      },
      {
        name: 'Bioluminescence',
        preset: 'Forest Ceremony',
        mode: 'orbital',
        duration: 45,
        breathSpeed: 0.15,
        luminous: 2,
        stars: 4,
        symmetry: 10,
      },
      {
        name: 'Thermocline',
        preset: 'Cosmic Indigo',
        mode: 'lorenz',
        duration: 45,
        breathSpeed: 0.2,
        luminous: 2,
        stars: 3,
        complexity: 4,
      },
      {
        name: 'Abyss Vortex',
        preset: 'Blue Astral',
        mode: 'tunnel',
        duration: 40,
        breathSpeed: 0.4,
        luminous: 3,
        stars: 7,
        glow: 5,
      },
      {
        name: 'Deep Current',
        preset: 'Warp Tunnel',
        mode: 'lissajous',
        duration: 40,
        breathSpeed: 0.18,
        luminous: 2,
        stars: 5,
        glow: 4,
      },
    ],
  },
  {
    id: 10,
    name: 'Desert Pulse',
    icon: 'DROP',
    desc: 'Trip 2 starts from the drop: amber desert pulse for deep chill, violins, and Burning Man energy. Turn Voice on to let sound push the rings.',
    stages: [
      {
        name: 'The Drop',
        preset: 'Amber Dust',
        mode: 'tripnumber2',
        duration: 36,
        symmetry: 9,
        complexity: 6.8,
        glow: 3.2,
        breathSpeed: 1.18,
        intensity: 9.2,
        particles: 9,
        luminous: 3.6,
        stars: 4,
      },
      {
        name: 'Violin Heat',
        preset: 'Golden Source',
        mode: 'tripnumber2',
        duration: 34,
        symmetry: 11,
        complexity: 5.6,
        glow: 2.6,
        breathSpeed: 0.92,
        intensity: 8.4,
        particles: 8,
        luminous: 4.2,
        stars: 5,
      },
      {
        name: 'Dust Vortex',
        preset: 'Amber Dust',
        mode: 'swirldottunnel',
        duration: 32,
        symmetry: 16,
        complexity: 7.8,
        glow: 7.2,
        breathSpeed: 0.94,
        intensity: 8.6,
        particles: 9,
        luminous: 3.2,
        stars: 3,
      },
      {
        name: 'Fire Walk',
        preset: 'Golden Source',
        mode: 'dotroad',
        duration: 30,
        symmetry: 7,
        complexity: 7.4,
        glow: 6.8,
        breathSpeed: 0.86,
        intensity: 8.8,
        particles: 9,
        luminous: 3.4,
        stars: 3,
      },
      {
        name: 'Return to Pulse',
        preset: 'Amber Dust',
        mode: 'tripnumber2',
        duration: 28,
        symmetry: 10,
        complexity: 5.2,
        glow: 2.4,
        breathSpeed: 0.72,
        intensity: 8,
        particles: 7,
        luminous: 3.8,
        stars: 4,
      },
    ],
  },
  {
    id: 11,
    name: 'Triangle Yantra Desert',
    icon: 'TRI',
    desc: 'Trip 3: angular 3D yantra lines, triangle gates, and desert-pulse geometry. Built for projection journeys that feel sacred, sharp, and rhythmic.',
    stages: [
      {
        name: 'Triangle Gate',
        preset: 'Golden Source',
        mode: 'tripnumber3',
        duration: 32,
        symmetry: 9,
        complexity: 5.4,
        glow: 3.8,
        breathSpeed: 0.72,
        intensity: 7.8,
        particles: 6,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Yantra Lift',
        preset: 'Amber Dust',
        mode: 'yantra3d',
        duration: 34,
        symmetry: 12,
        complexity: 7.2,
        glow: 5.8,
        breathSpeed: 0.82,
        intensity: 8.6,
        particles: 7,
        luminous: 3.6,
        stars: 5,
      },
      {
        name: 'Line Temple',
        preset: 'Golden Source',
        mode: 'tripnumber3',
        duration: 34,
        symmetry: 14,
        complexity: 7.8,
        glow: 5.2,
        breathSpeed: 0.94,
        intensity: 9.2,
        particles: 8,
        luminous: 4.1,
        stars: 5,
      },
      {
        name: 'Desert Cut',
        preset: 'Amber Dust',
        mode: 'swirldottunnel',
        duration: 30,
        symmetry: 16,
        complexity: 8.2,
        glow: 6.8,
        breathSpeed: 1.05,
        intensity: 8.8,
        particles: 8,
        luminous: 3.8,
        stars: 4,
      },
      {
        name: 'Sacred Drop',
        preset: 'Amber Dust',
        mode: 'tripnumber3',
        duration: 30,
        symmetry: 12,
        complexity: 8.8,
        glow: 6.2,
        breathSpeed: 1.14,
        intensity: 9.4,
        particles: 9,
        luminous: 4.5,
        stars: 6,
      },
      {
        name: 'Still Triangle',
        preset: 'Golden Source',
        mode: 'tripnumber3',
        duration: 26,
        symmetry: 6,
        complexity: 4.4,
        glow: 3.2,
        breathSpeed: 0.58,
        intensity: 7.6,
        particles: 5,
        luminous: 3.2,
        stars: 3,
      },
    ],
  },
  // ── 20-minute projection programs (Reconnect Festival, Gstaad) ──
  // Long-form journeys that loop seamlessly: each stage morphs into the
  // next, and the final stage eases back into the first for an endless set.
  // ~1200s total each. Curated from the strongest presets/modes.
  {
    id: 12,
    name: 'Cathedral of Light',
    icon: 'LIGHT',
    desc: '20-minute sacred-geometry ceremony — a Fibonacci seed blooming through rose windows, cathedrals, yantra and a golden mandala, then home. Slow, warm, meditative. Best on a big projector.',
    stages: [
      {
        name: 'Fibonacci Seed',
        preset: 'Fibonacci Bloom',
        mode: 'fibonacci',
        duration: 120,
        breathSpeed: 0.08,
        complexity: 5,
        luminous: 2,
        glow: 4,
        stars: 1,
      },
      {
        name: 'Flower of Life',
        preset: 'Calm Field',
        mode: 'sacred',
        duration: 140,
        symmetry: 12,
        breathSpeed: 0.1,
        luminous: 2,
        particles: 3,
        glow: 5,
      },
      {
        name: 'Rose Window',
        preset: 'Sacred Vitral',
        mode: 'vitral',
        duration: 140,
        symmetry: 12,
        breathSpeed: 0.1,
        luminous: 2,
        glow: 4,
      },
      {
        name: 'Gothic Cathedral',
        preset: 'Sacred Architecture',
        mode: 'cathedral',
        duration: 140,
        symmetry: 10,
        complexity: 6,
        breathSpeed: 0.12,
        luminous: 3,
        glow: 7,
      },
      {
        name: 'Islamic Court',
        preset: 'Islamic Garden',
        mode: 'islamic',
        duration: 140,
        symmetry: 12,
        complexity: 5,
        breathSpeed: 0.1,
        luminous: 2,
        glow: 4,
      },
      {
        name: 'Yantra Fire',
        preset: 'Yantra Fire',
        mode: 'yantra',
        duration: 130,
        symmetry: 9,
        complexity: 5,
        breathSpeed: 0.12,
        luminous: 2,
        glow: 5,
      },
      {
        name: 'Golden Mandala',
        preset: 'Golden Source',
        mode: 'kaleidoscope',
        duration: 130,
        symmetry: 16,
        breathSpeed: 0.14,
        luminous: 2,
        glow: 6,
      },
      {
        name: 'Crystal Orbit',
        preset: 'Crystal Lattice',
        mode: 'geodesic',
        duration: 130,
        complexity: 5,
        breathSpeed: 0.12,
        luminous: 2,
        glow: 6,
        stars: 2,
      },
      {
        name: 'Return to Source',
        preset: 'Fibonacci Bloom',
        mode: 'fibonacci',
        duration: 130,
        breathSpeed: 0.08,
        complexity: 6,
        luminous: 1,
        glow: 4,
        stars: 1,
      },
    ],
  },
  {
    id: 13,
    name: 'Cosmos Drift',
    icon: 'COSMOS',
    desc: '20-minute deep-space drift — stargate, wormhole, strange attractors, galaxy spirals and nebulae. Psychedelic blues and violets. Turn Voice on to let the music push it.',
    stages: [
      {
        name: 'Stargate',
        preset: 'Warp Drive',
        mode: 'warp',
        duration: 120,
        breathSpeed: 0.4,
        luminous: 3,
        stars: 9,
        glow: 6,
      },
      {
        name: 'Wormhole',
        preset: 'Warp Tunnel',
        mode: 'tunnel',
        duration: 140,
        breathSpeed: 0.5,
        luminous: 3,
        stars: 7,
        glow: 5,
      },
      {
        name: 'Strange Attractor',
        preset: 'Cosmic Indigo',
        mode: 'lorenz',
        duration: 130,
        breathSpeed: 0.28,
        luminous: 3,
        stars: 5,
        complexity: 5,
      },
      {
        name: 'Wave Field',
        preset: 'Blue Astral',
        mode: 'lissajous',
        duration: 130,
        breathSpeed: 0.35,
        luminous: 3,
        stars: 7,
      },
      {
        name: 'Galaxy Spiral',
        preset: 'Violet Portal',
        mode: 'kaleidoscope',
        duration: 140,
        symmetry: 14,
        breathSpeed: 0.32,
        luminous: 3,
        stars: 6,
        glow: 7,
      },
      {
        name: 'Nebula Veil',
        preset: 'Cosmic Indigo',
        mode: 'nebula',
        duration: 140,
        breathSpeed: 0.18,
        luminous: 3,
        stars: 6,
        glow: 6,
      },
      {
        name: 'Chaos Bloom',
        preset: 'Clifford Dream',
        mode: 'clifford',
        duration: 130,
        breathSpeed: 0.26,
        luminous: 3,
        complexity: 8,
        glow: 6,
      },
      {
        name: 'Crystal Fold',
        preset: '4D Crystal',
        mode: 'hypercube',
        duration: 140,
        breathSpeed: 0.24,
        luminous: 3,
        complexity: 8,
        glow: 7,
      },
      {
        name: 'Deep Drift',
        preset: 'Warp Tunnel',
        mode: 'tunnel',
        duration: 130,
        breathSpeed: 0.45,
        luminous: 4,
        stars: 9,
        glow: 7,
      },
    ],
  },
  {
    id: 14,
    name: 'Desert Temple',
    icon: 'DESERT',
    desc: '20-minute festival drop — amber desert pulse, dust vortices, triangle yantra gates and tunnels. High energy, sound-reactive. Built for the Gstaad night — turn Voice on.',
    stages: [
      {
        name: 'Dawn Pulse',
        preset: 'Amber Dust',
        mode: 'tripnumber2',
        duration: 110,
        symmetry: 9,
        complexity: 5.4,
        glow: 3,
        breathSpeed: 0.7,
        intensity: 7.6,
        particles: 7,
        luminous: 3.4,
        stars: 4,
      },
      {
        name: 'Violin Heat',
        preset: 'Golden Source',
        mode: 'tripnumber2',
        duration: 120,
        symmetry: 11,
        complexity: 5.6,
        glow: 2.6,
        breathSpeed: 0.9,
        intensity: 8.4,
        particles: 8,
        luminous: 4,
        stars: 5,
      },
      {
        name: 'Dust Vortex',
        preset: 'Amber Dust',
        mode: 'swirldottunnel',
        duration: 120,
        symmetry: 16,
        complexity: 7.8,
        glow: 7,
        breathSpeed: 0.94,
        intensity: 8.6,
        particles: 9,
        luminous: 3.2,
        stars: 3,
      },
      {
        name: 'Fire Walk',
        preset: 'Golden Source',
        mode: 'dotroad',
        duration: 120,
        symmetry: 7,
        complexity: 7.4,
        glow: 6.8,
        breathSpeed: 0.86,
        intensity: 8.8,
        particles: 9,
        luminous: 3.4,
        stars: 3,
      },
      {
        name: 'Triangle Gate',
        preset: 'Golden Source',
        mode: 'tripnumber3',
        duration: 120,
        symmetry: 9,
        complexity: 5.4,
        glow: 3.8,
        breathSpeed: 0.82,
        intensity: 8,
        particles: 6,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Yantra Lift',
        preset: 'Amber Dust',
        mode: 'yantra3d',
        duration: 130,
        symmetry: 12,
        complexity: 7.2,
        glow: 5.8,
        breathSpeed: 0.82,
        intensity: 8.6,
        particles: 7,
        luminous: 3.6,
        stars: 5,
      },
      {
        name: 'Desert Cut',
        preset: 'Amber Dust',
        mode: 'swirldottunnel',
        duration: 120,
        symmetry: 16,
        complexity: 8.2,
        glow: 6.8,
        breathSpeed: 1.05,
        intensity: 8.8,
        particles: 8,
        luminous: 3.8,
        stars: 4,
      },
      {
        name: 'Sacred Drop',
        preset: 'DMT Vision',
        mode: 'tripnumber3',
        duration: 130,
        symmetry: 12,
        complexity: 8.8,
        glow: 6.2,
        breathSpeed: 1.14,
        intensity: 9.4,
        particles: 9,
        luminous: 4.5,
        stars: 6,
      },
      {
        name: 'Deep Tunnel',
        preset: 'Warp Tunnel',
        mode: 'dottunnel',
        duration: 120,
        symmetry: 12,
        complexity: 7,
        glow: 5.5,
        breathSpeed: 0.9,
        intensity: 8.2,
        particles: 8,
        luminous: 3.6,
        stars: 5,
      },
      {
        name: 'Return to Pulse',
        preset: 'Amber Dust',
        mode: 'tripnumber2',
        duration: 110,
        symmetry: 9,
        complexity: 5,
        glow: 3,
        breathSpeed: 0.66,
        intensity: 7.4,
        particles: 6,
        luminous: 3.4,
        stars: 4,
      },
    ],
  },
  {
    id: 15,
    name: 'Trip Number 4',
    icon: 'TRIP4',
    desc: 'Prisms, ocean currents and a beating heart — kaleidoscope blends and two crazy bursts in between. A long ~8-minute looping trip.',
    stages: [
      {
        name: 'Prism Bloom',
        preset: 'Prism Rose',
        mode: 'prism',
        duration: 55,
        symmetry: 8,
        complexity: 6,
        glow: 7,
        breathSpeed: 0.5,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Prism Fold',
        preset: 'Prism Void',
        mode: 'prism3d',
        duration: 55,
        symmetry: 8,
        complexity: 6,
        glow: 7,
        breathSpeed: 0.45,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Kaleido Crystal',
        preset: 'Prism Ice',
        mode: 'kaleidoscope',
        duration: 45,
        symmetry: 16,
        glow: 7,
        breathSpeed: 0.3,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Ocean Drift',
        preset: 'Deep Current',
        mode: 'current',
        duration: 55,
        symmetry: 4,
        complexity: 5,
        glow: 3,
        breathSpeed: 0.35,
        intensity: 7,
        luminous: 2,
      },
      {
        name: 'Cyclone Tiles',
        preset: 'Deep Current',
        mode: 'cyclonetiles',
        duration: 50,
        symmetry: 8,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.55,
        intensity: 8,
        luminous: 2,
      },
      {
        name: 'Storm Surge',
        preset: 'Cosmic Indigo',
        mode: 'lorenz',
        duration: 40,
        complexity: 7,
        glow: 5,
        breathSpeed: 0.5,
        luminous: 3,
        stars: 4,
      },
      {
        name: 'Dot Heart',
        preset: 'Golden Source',
        mode: 'dotheart',
        duration: 55,
        symmetry: 9,
        complexity: 6.4,
        glow: 7,
        breathSpeed: 0.72,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 1,
      },
      {
        name: 'Warp Bridge',
        preset: 'Warp Drive',
        mode: 'warp',
        duration: 45,
        breathSpeed: 0.6,
        glow: 6,
        luminous: 3,
        stars: 9,
      },
      {
        name: 'Prism Sands',
        preset: 'Prism Rose',
        mode: 'flowsands',
        duration: 55,
        symmetry: 14,
        complexity: 6,
        glow: 5.5,
        breathSpeed: 0.45,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Prism Lines',
        preset: 'Prism Void',
        mode: 'flowlines',
        duration: 55,
        symmetry: 12,
        complexity: 4,
        glow: 5.5,
        breathSpeed: 0.42,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 4,
      },
      {
        name: 'Prism Butterfly',
        preset: 'Prism Ice',
        mode: 'flowbutterfly',
        duration: 55,
        symmetry: 12,
        complexity: 5,
        glow: 5.5,
        breathSpeed: 0.45,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Prism Return',
        preset: 'Prism Rose',
        mode: 'prism',
        duration: 50,
        symmetry: 8,
        complexity: 6,
        glow: 7,
        breathSpeed: 0.5,
        intensity: 8,
        luminous: 3,
      },
    ],
  },
  {
    id: 16,
    name: 'Trip Number 5',
    icon: 'WALK',
    desc: 'The dot-walkers. Each figure enters alone, blends into three, then morphs into the next shape — cycling through all five walkers in a long ~7.5-minute loop.',
    stages: [
      {
        name: 'Walker I · solo',
        preset: 'Golden Source',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 1,
        stars: 1,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.7,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walker I · trio',
        preset: 'Golden Source',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 1,
        stars: 3,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.7,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walker II · solo',
        preset: 'Amber Dust',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 2,
        stars: 1,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.72,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walker II · trio',
        preset: 'Amber Dust',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 2,
        stars: 3,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.72,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walker III · solo',
        preset: 'Cosmic Indigo',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 3,
        stars: 1,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.74,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walker III · trio',
        preset: 'Cosmic Indigo',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 3,
        stars: 3,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.74,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walker IV · solo',
        preset: 'Forest Ceremony',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 4,
        stars: 1,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.72,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walker IV · trio',
        preset: 'Forest Ceremony',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 4,
        stars: 3,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.72,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walker V · solo',
        preset: 'Violet Portal',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 5,
        stars: 1,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.74,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walker V · trio',
        preset: 'Violet Portal',
        mode: 'dotwalker',
        duration: 45,
        symmetry: 5,
        stars: 3,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.74,
        intensity: 8,
        luminous: 3,
      },
    ],
  },
  {
    id: 17,
    name: 'Trip Number 1',
    icon: 'TRIP1',
    desc: 'The golden trip — slow, warm and long. Trip-1 geometry breathing through swirl tunnels, Fibonacci drift, golden shifting sands, an alchemical sun, golden line-works, a golden butterfly and sacred gold, then home. Smooth, fully continuous ~12-minute loop.',
    stages: [
      {
        name: 'Golden Trip',
        preset: 'Golden Source',
        mode: 'tripnumber1',
        duration: 80,
        symmetry: 10,
        complexity: 7.6,
        glow: 6.8,
        breathSpeed: 0.34,
        intensity: 8.4,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Swirl Bloom',
        preset: 'Golden Source',
        mode: 'swirldottunnel',
        duration: 70,
        symmetry: 12,
        complexity: 7,
        glow: 6,
        breathSpeed: 0.42,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Fibonacci Drift',
        preset: 'Fibonacci Bloom',
        mode: 'fibonacci',
        duration: 70,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.2,
        intensity: 7,
        luminous: 2,
        stars: 2,
      },
      {
        name: 'Golden Sands',
        preset: 'Golden Source',
        mode: 'flowsands',
        duration: 85,
        symmetry: 14,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Alchemical Sun',
        preset: 'Golden Source',
        mode: 'dotalchemicalsun',
        duration: 70,
        symmetry: 10,
        complexity: 7,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Golden Lines',
        preset: 'Golden Source',
        mode: 'flowlines',
        duration: 80,
        symmetry: 12,
        complexity: 4,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 3,
      },
      {
        name: 'Golden Trip II',
        preset: 'Golden Source',
        mode: 'tripnumber1',
        duration: 80,
        symmetry: 12,
        complexity: 8,
        glow: 7,
        breathSpeed: 0.36,
        intensity: 8.4,
        particles: 9,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Golden Butterfly',
        preset: 'Golden Source',
        mode: 'flowbutterfly',
        duration: 75,
        symmetry: 12,
        complexity: 5,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Orbital Calm',
        preset: 'Calm Field',
        mode: 'orbital',
        duration: 70,
        symmetry: 8,
        glow: 4,
        breathSpeed: 0.18,
        intensity: 7,
        luminous: 2,
        stars: 4,
      },
      {
        name: 'Sacred Gold',
        preset: 'Golden Source',
        mode: 'flowsacred',
        duration: 75,
        symmetry: 12,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.38,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Return Trip',
        preset: 'Golden Source',
        mode: 'tripnumber1',
        duration: 70,
        symmetry: 10,
        complexity: 7.6,
        glow: 6.8,
        breathSpeed: 0.34,
        intensity: 8.4,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
    ],
  },
  {
    id: 18,
    name: 'Trip Number 3',
    icon: 'TRIP3',
    desc: 'The triangle trip, fully evolved — opens on a single minimal triangle that multiplies, hardens into the angular trip-3 gate, lifts through moving line-works, 3D triangles, yantra and a sacred pyramid, blends into hypercube/prism/tri-sphere, then destructures into sand and re-forms — always anchored in the triangle, sometimes shattering into further shapes. Long, smooth, continuous ~16-minute loop.',
    stages: [
      {
        name: 'One Triangle',
        preset: 'Golden Source',
        mode: 'flowsacred',
        duration: 70,
        symmetry: 12,
        complexity: 2,
        glow: 5,
        breathSpeed: 0.32,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 3,
      },
      {
        name: 'Triangles Wake',
        preset: 'Yantra Fire',
        mode: 'flowsacred',
        duration: 65,
        symmetry: 12,
        complexity: 4,
        glow: 5.5,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.7,
        stars: 4,
      },
      {
        name: 'Triangle Gate',
        preset: 'Golden Source',
        mode: 'tripnumber3',
        duration: 60,
        symmetry: 12,
        complexity: 7.4,
        glow: 4.8,
        breathSpeed: 0.86,
        intensity: 8.8,
        particles: 8,
        luminous: 3.8,
        stars: 5,
      },
      {
        name: 'Moving Lines',
        preset: 'Cosmic Indigo',
        mode: 'flowlines',
        duration: 65,
        symmetry: 12,
        complexity: 4,
        glow: 5.5,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 4,
      },
      {
        name: 'Triangles 3D',
        preset: 'Cosmic Indigo',
        mode: 'chaostri3d',
        duration: 55,
        complexity: 8,
        glow: 5,
        breathSpeed: 0.6,
        intensity: 8,
        luminous: 3,
        stars: 4,
      },
      {
        name: 'Yantra Lift',
        preset: 'Yantra Fire',
        mode: 'yantra3d',
        duration: 60,
        symmetry: 12,
        complexity: 7,
        glow: 5,
        breathSpeed: 0.8,
        intensity: 8.6,
        luminous: 3.6,
        stars: 5,
      },
      {
        name: 'Sacred Pyramid',
        preset: 'Golden Source',
        mode: 'pyramid3d',
        duration: 65,
        symmetry: 12,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8.4,
        luminous: 3.2,
        stars: 4,
      },
      {
        name: 'Hypercube Fold',
        preset: '4D Crystal',
        mode: 'hypercube',
        duration: 55,
        complexity: 8,
        glow: 7,
        breathSpeed: 0.5,
        intensity: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Prism Core',
        preset: 'Prism Void',
        mode: 'prism3d',
        duration: 55,
        symmetry: 8,
        complexity: 6,
        glow: 7,
        breathSpeed: 0.5,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Tri Sphere Blend',
        preset: 'Violet Portal',
        mode: 'chaostrisphere',
        duration: 55,
        complexity: 8,
        glow: 6,
        breathSpeed: 0.5,
        intensity: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Destructure',
        preset: 'Cosmic Indigo',
        mode: 'flowsands',
        duration: 70,
        symmetry: 14,
        complexity: 7,
        glow: 5.5,
        breathSpeed: 0.5,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Knot Reform',
        preset: 'Golden Source',
        mode: 'tknot3d',
        duration: 60,
        symmetry: 16,
        complexity: 8,
        glow: 6,
        breathSpeed: 0.8,
        intensity: 8.8,
        luminous: 3.8,
        stars: 4,
      },
      {
        name: 'Yantra Flow',
        preset: 'Yantra Fire',
        mode: 'flowsacred',
        duration: 65,
        symmetry: 12,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.5,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 4,
      },
      {
        name: 'Triangle Storm',
        preset: 'Golden Source',
        mode: 'tripnumber3',
        duration: 60,
        symmetry: 14,
        complexity: 8.2,
        glow: 5.2,
        breathSpeed: 1.0,
        intensity: 9,
        particles: 8,
        luminous: 3.8,
        stars: 5,
      },
      {
        name: 'Lines Settle',
        preset: 'Golden Source',
        mode: 'flowlines',
        duration: 60,
        symmetry: 12,
        complexity: 4,
        glow: 5.5,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 4,
      },
      {
        name: 'Return to One',
        preset: 'Golden Source',
        mode: 'flowsacred',
        duration: 65,
        symmetry: 12,
        complexity: 2,
        glow: 5,
        breathSpeed: 0.32,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 3,
      },
    ],
  },
  {
    id: 19,
    name: 'Long Trip',
    icon: 'LONG',
    desc: 'Everything, woven into one ~15-minute journey — the golden trip, prisms and ocean, the triangle evolutions, the dot-walkers, a beating heart and a crazy burst, the desert drop, and home. The full set as a single long loop.',
    stages: [
      {
        name: 'Golden Trip',
        preset: 'Golden Source',
        mode: 'tripnumber1',
        duration: 60,
        symmetry: 10,
        complexity: 7.6,
        glow: 6.8,
        breathSpeed: 0.34,
        intensity: 8.4,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Swirl Bloom',
        preset: 'Golden Source',
        mode: 'swirldottunnel',
        duration: 55,
        symmetry: 12,
        complexity: 7,
        glow: 6,
        breathSpeed: 0.42,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Fibonacci Drift',
        preset: 'Fibonacci Bloom',
        mode: 'fibonacci',
        duration: 55,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.2,
        intensity: 7,
        luminous: 2,
        stars: 2,
      },
      {
        name: 'Prism Bloom',
        preset: 'Prism Rose',
        mode: 'prism',
        duration: 55,
        symmetry: 8,
        complexity: 6,
        glow: 7,
        breathSpeed: 0.5,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Ocean Drift',
        preset: 'Deep Current',
        mode: 'current',
        duration: 55,
        symmetry: 4,
        complexity: 5,
        glow: 3,
        breathSpeed: 0.35,
        intensity: 7,
        luminous: 2,
      },
      {
        name: 'Triangle Gate',
        preset: 'Golden Source',
        mode: 'tripnumber3',
        duration: 60,
        symmetry: 12,
        complexity: 7.4,
        glow: 4.8,
        breathSpeed: 0.86,
        intensity: 8.8,
        particles: 8,
        luminous: 3.8,
        stars: 5,
      },
      {
        name: 'Yantra Lift',
        preset: 'Yantra Fire',
        mode: 'yantra3d',
        duration: 55,
        symmetry: 12,
        complexity: 7,
        glow: 5,
        breathSpeed: 0.8,
        intensity: 8.6,
        luminous: 3.6,
        stars: 5,
      },
      {
        name: 'Hypercube Fold',
        preset: '4D Crystal',
        mode: 'hypercube',
        duration: 55,
        complexity: 8,
        glow: 7,
        breathSpeed: 0.5,
        intensity: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Knot Temple',
        preset: 'Golden Source',
        mode: 'tknot3d',
        duration: 55,
        symmetry: 16,
        complexity: 8,
        glow: 6,
        breathSpeed: 1.0,
        intensity: 8.8,
        luminous: 3.8,
        stars: 4,
      },
      {
        name: 'Walkers Solo',
        preset: 'Cosmic Indigo',
        mode: 'dotwalker',
        duration: 55,
        symmetry: 3,
        stars: 1,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.72,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Walkers Trio',
        preset: 'Forest Ceremony',
        mode: 'dotwalker',
        duration: 55,
        symmetry: 4,
        stars: 3,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.74,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Dot Heart',
        preset: 'Golden Source',
        mode: 'dotheart',
        duration: 60,
        symmetry: 9,
        complexity: 6.4,
        glow: 7,
        breathSpeed: 0.72,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 1,
      },
      {
        name: 'Desert Drop',
        preset: 'Amber Dust',
        mode: 'tripnumber2',
        duration: 55,
        symmetry: 9,
        complexity: 6.8,
        glow: 3.2,
        breathSpeed: 1.18,
        intensity: 9.2,
        particles: 9,
        luminous: 3.6,
        stars: 4,
      },
      {
        name: 'Dust Vortex',
        preset: 'Amber Dust',
        mode: 'swirldottunnel',
        duration: 55,
        symmetry: 16,
        complexity: 7.8,
        glow: 7,
        breathSpeed: 0.94,
        intensity: 8.6,
        particles: 9,
        luminous: 3.2,
        stars: 3,
      },
      {
        name: 'Golden Return',
        preset: 'Golden Source',
        mode: 'tripnumber1',
        duration: 55,
        symmetry: 10,
        complexity: 7.6,
        glow: 6.8,
        breathSpeed: 0.34,
        intensity: 8.4,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
    ],
  },
  {
    id: 20,
    name: 'Trip Number 6',
    icon: 'TRIP6',
    desc: 'A slow, continuous evolution of the 4D crystal — hypercube folding through lattice, torus knot, prism core and wave crystal, then back. Pleasant and transformative.',
    stages: [
      {
        name: '4D Crystal',
        preset: '4D Crystal',
        mode: 'hypercube',
        duration: 80,
        complexity: 8,
        glow: 7,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Crystal Lattice',
        preset: 'Crystal Lattice',
        mode: 'geodesic',
        duration: 75,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Torus Crystal',
        preset: 'Cosmic Indigo',
        mode: 'tknot3d',
        duration: 75,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Prism Core',
        preset: 'Prism Void',
        mode: 'prism3d',
        duration: 75,
        symmetry: 8,
        complexity: 6,
        glow: 7,
        breathSpeed: 0.2,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Wave Crystal',
        preset: 'Blue Astral',
        mode: 'lissajous3d',
        duration: 75,
        complexity: 5,
        glow: 6,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Crystal Lines',
        preset: 'Cosmic Indigo',
        mode: 'flowlines',
        duration: 75,
        symmetry: 12,
        complexity: 4,
        glow: 6,
        breathSpeed: 0.2,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 3,
      },
      {
        name: 'Crystal Sands',
        preset: 'Crystal Lattice',
        mode: 'flowsands',
        duration: 75,
        symmetry: 14,
        complexity: 6,
        glow: 5.5,
        breathSpeed: 0.22,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 2,
      },
      {
        name: 'Crystal Sacred',
        preset: 'Blue Astral',
        mode: 'flowsacred',
        duration: 75,
        symmetry: 12,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.2,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Return Crystal',
        preset: '4D Crystal',
        mode: 'hypercube',
        duration: 75,
        complexity: 8,
        glow: 7,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
        stars: 2,
      },
    ],
  },
  {
    id: 21,
    name: 'Trip Number 7',
    icon: 'TRIP7',
    desc: 'Lines that reshape and move — orbital 3D woven through torus knot, rose, helix and wave curves in one continuous, slow, transformative journey.',
    stages: [
      {
        name: 'Orbital Lines',
        preset: 'Cosmic Indigo',
        mode: 'orbital3d',
        duration: 80,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
        stars: 4,
      },
      {
        name: 'Torus Weave',
        preset: 'Violet Portal',
        mode: 'tknot3d',
        duration: 75,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Rose Lines',
        preset: 'Blue Astral',
        mode: 'rose3d',
        duration: 75,
        complexity: 5,
        glow: 6,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Helix Drift',
        preset: 'Forest Ceremony',
        mode: 'helix3d',
        duration: 75,
        complexity: 5,
        glow: 5,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Wave Lines',
        preset: 'Crystal Lattice',
        mode: 'lissajous3d',
        duration: 75,
        complexity: 5,
        glow: 6,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Helix Spiral',
        preset: 'Cosmic Indigo',
        mode: 'helix3d',
        duration: 70,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Sand Knot',
        preset: 'Cosmic Indigo',
        mode: 'flowlines',
        duration: 75,
        symmetry: 12,
        complexity: 4,
        glow: 6,
        breathSpeed: 0.2,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 4,
      },
      {
        name: 'Rose Sand Lines',
        preset: 'Violet Portal',
        mode: 'flowlines',
        duration: 75,
        symmetry: 12,
        complexity: 4,
        glow: 6,
        breathSpeed: 0.2,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 4,
      },
      {
        name: 'Sacred Orbit',
        preset: 'Blue Astral',
        mode: 'flowsacred',
        duration: 70,
        symmetry: 12,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.2,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Return Orbit',
        preset: 'Cosmic Indigo',
        mode: 'orbital3d',
        duration: 75,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
        stars: 4,
      },
    ],
  },
  {
    id: 22,
    name: 'Mega Trip',
    icon: 'MEGA',
    desc: 'Sacred psychedelia, ~13 minutes, continuous and transformative — alchemical dots into heart dots, orbits, living cells and liquid pearl, prism and prism core, cathedral glass and vitral, a rainbow mandala and a bloom field, then home to the dots.',
    stages: [
      {
        name: 'Alchemical Dots',
        preset: 'Golden Source',
        mode: 'dotalchemicalsun',
        duration: 55,
        symmetry: 10,
        complexity: 7,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Heart Dots',
        preset: 'Rose Quartz',
        mode: 'dotheart',
        duration: 55,
        symmetry: 9,
        complexity: 6.4,
        glow: 7,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 1,
      },
      {
        name: 'Orbital Bloom',
        preset: 'Violet Portal',
        mode: 'orbital',
        duration: 55,
        symmetry: 10,
        glow: 6,
        breathSpeed: 0.2,
        intensity: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Orbit Rings',
        preset: 'Cosmic Indigo',
        mode: 'orbit',
        duration: 55,
        glow: 6,
        breathSpeed: 0.2,
        intensity: 8,
        luminous: 3,
        stars: 4,
      },
      {
        name: 'Orbital 3D',
        preset: 'Blue Astral',
        mode: 'orbital3d',
        duration: 55,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
        stars: 4,
      },
      {
        name: 'Living Cells',
        preset: 'Cell Biolum',
        mode: 'cells',
        duration: 55,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.3,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Liquid Pearl',
        preset: 'Liquid Pearl',
        mode: 'liquid',
        duration: 55,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.3,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Prism Bloom',
        preset: 'Prism Rose',
        mode: 'prism',
        duration: 55,
        symmetry: 8,
        complexity: 6,
        glow: 7,
        breathSpeed: 0.4,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Prism Core',
        preset: 'Prism Void',
        mode: 'prism3d',
        duration: 55,
        symmetry: 8,
        complexity: 6,
        glow: 7,
        breathSpeed: 0.4,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Cathedral Glass',
        preset: 'Sacred Architecture',
        mode: 'cathedral',
        duration: 55,
        symmetry: 10,
        complexity: 6,
        glow: 7,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Vitral Window',
        preset: 'Sacred Vitral',
        mode: 'vitral',
        duration: 55,
        symmetry: 12,
        glow: 6,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Rainbow Mandala',
        preset: 'Rainbow Mist',
        mode: 'kaleidoscope',
        duration: 55,
        symmetry: 16,
        glow: 7,
        breathSpeed: 0.3,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Bloom Field',
        preset: 'Fibonacci Bloom',
        mode: 'bloom',
        duration: 55,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.3,
        intensity: 8,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Pearl Sands',
        preset: 'Liquid Pearl',
        mode: 'flowsands',
        duration: 55,
        symmetry: 14,
        complexity: 6,
        glow: 5.5,
        breathSpeed: 0.35,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Heart Butterfly',
        preset: 'Rose Quartz',
        mode: 'flowbutterfly',
        duration: 55,
        symmetry: 12,
        complexity: 5,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Sacred Lines',
        preset: 'Violet Portal',
        mode: 'flowlines',
        duration: 55,
        symmetry: 12,
        complexity: 4,
        glow: 5.5,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 4,
      },
      {
        name: 'Return to Dots',
        preset: 'Golden Source',
        mode: 'dotalchemicalsun',
        duration: 55,
        symmetry: 10,
        complexity: 7,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 2,
      },
    ],
  },
  {
    id: 23,
    name: 'Magnetic Sands',
    icon: 'SANDS',
    desc: 'The continuous-transformation trip — built around magnetic sand. Sand fields evolve through scales, cyclone tiles, eddy lace and deep currents, with orbital revolutions and gravity wells. Slow, patterned, endlessly reshaping. ~11-minute loop.',
    stages: [
      {
        name: 'Magnetic Sands',
        preset: 'Amber Dust',
        mode: 'magneticsand',
        duration: 70,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Sand Scales',
        preset: 'Terra Globe',
        mode: 'currentscales',
        duration: 65,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Cyclone Tiles',
        preset: 'Deep Current',
        mode: 'cyclonetiles',
        duration: 65,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.2,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Eddy Lace',
        preset: 'Cosmic Indigo',
        mode: 'eddylace',
        duration: 65,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Deep Current',
        preset: 'Deep Current',
        mode: 'current',
        duration: 65,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Orbital Revolution',
        preset: 'Cosmic Indigo',
        mode: 'orbital3d',
        duration: 65,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
        stars: 4,
      },
      {
        name: 'Gravity Wells',
        preset: 'Forest Ceremony',
        mode: 'gravity',
        duration: 65,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.18,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Cyclone Storm',
        preset: 'Amber Dust',
        mode: 'cyclonetiles',
        duration: 65,
        complexity: 7,
        glow: 6,
        breathSpeed: 0.22,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Sand Currents',
        preset: 'Golden Source',
        mode: 'current',
        duration: 65,
        complexity: 5,
        glow: 4,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
      },
      {
        name: 'Magnetic Return',
        preset: 'Amber Dust',
        mode: 'magneticsand',
        duration: 65,
        complexity: 6,
        glow: 5,
        breathSpeed: 0.16,
        intensity: 8,
        luminous: 3,
      },
    ],
  },
  {
    id: 24,
    name: 'Prism Mega Trip',
    icon: 'PRISM',
    desc: 'The colourful sacred-glass journey — prism cores blooming through stained-glass seeds and cathedral light, woven with sacred flow and golden sand. Psychedelic, luminous, continuously transforming. ~9-minute loop.',
    stages: [
      {
        name: 'Prism Core',
        preset: 'Prism Void',
        mode: 'prism3d',
        duration: 75,
        symmetry: 8,
        complexity: 7,
        glow: 6,
        breathSpeed: 0.3,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 3,
      },
      {
        name: 'Prism Bloom',
        preset: 'Prism Rose',
        mode: 'prism',
        duration: 70,
        symmetry: 9,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.28,
        intensity: 8,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Stained Seed',
        preset: 'Prism Warm',
        mode: 'prism',
        duration: 70,
        symmetry: 7,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.26,
        intensity: 8,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Cathedral Light',
        preset: 'Prism Warm',
        mode: 'prism',
        duration: 70,
        symmetry: 11,
        complexity: 7,
        glow: 6.5,
        breathSpeed: 0.3,
        intensity: 8.4,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Sacred Weave',
        preset: 'Violet Portal',
        mode: 'flowsacred',
        duration: 75,
        symmetry: 12,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Rose Prism',
        preset: 'Prism Rose',
        mode: 'prism',
        duration: 70,
        symmetry: 9,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.28,
        intensity: 8,
        luminous: 3,
        stars: 2,
      },
      {
        name: 'Golden Sands',
        preset: 'Amber Dust',
        mode: 'flowsands',
        duration: 75,
        symmetry: 14,
        complexity: 6,
        glow: 5.5,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Prism Return',
        preset: 'Prism Void',
        mode: 'prism3d',
        duration: 70,
        symmetry: 8,
        complexity: 7,
        glow: 6,
        breathSpeed: 0.3,
        intensity: 8,
        particles: 8,
        luminous: 3,
        stars: 3,
      },
    ],
  },
  {
    id: 25,
    name: 'Butterfly Trip',
    icon: 'FLY',
    desc: 'The butterfly journey — dots gather into a flapping butterfly, two dancers bloom and merge, the wings spin and divide, then reunite. A soft sacred halo holds it all. Continuous, tender, looping. ~7-minute loop.',
    stages: [
      {
        name: 'Butterfly',
        preset: 'Rose Quartz',
        mode: 'flowbutterfly',
        duration: 75,
        symmetry: 12,
        complexity: 5,
        glow: 5,
        breathSpeed: 0.45,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Two Dancers',
        preset: 'Rose Quartz',
        mode: 'flowdance',
        duration: 75,
        symmetry: 12,
        complexity: 5,
        glow: 5,
        breathSpeed: 0.45,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 2,
      },
      {
        name: 'Wing Spin',
        preset: 'Cosmic Indigo',
        mode: 'flowbutterfly',
        duration: 70,
        symmetry: 12,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.6,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Sacred Halo',
        preset: 'Violet Portal',
        mode: 'flowsacred',
        duration: 70,
        symmetry: 12,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Butterfly Return',
        preset: 'Rose Quartz',
        mode: 'flowbutterfly',
        duration: 70,
        symmetry: 12,
        complexity: 5,
        glow: 5,
        breathSpeed: 0.45,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
    ],
  },
  {
    id: 26,
    name: 'Star Sand Lines',
    icon: 'LINES',
    desc: 'The line-art trip — shifting star-sand draws the great line-works out of dots: torus knot, rose, orbital rings and helix, melting from one into the next, threaded with golden sand. Crisp, sacred, continuously transforming. ~8-minute loop.',
    stages: [
      {
        name: 'Torus Knot',
        preset: 'Cosmic Indigo',
        mode: 'flowlines',
        duration: 75,
        symmetry: 12,
        complexity: 4,
        glow: 5,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.4,
        stars: 4,
      },
      {
        name: 'Rose Line',
        preset: 'Violet Portal',
        mode: 'flowlines',
        duration: 70,
        symmetry: 12,
        complexity: 4,
        glow: 5.5,
        breathSpeed: 0.42,
        intensity: 8,
        particles: 9,
        luminous: 2.4,
        stars: 4,
      },
      {
        name: 'Sand Weave',
        preset: 'Amber Dust',
        mode: 'flowsands',
        duration: 75,
        symmetry: 14,
        complexity: 6,
        glow: 5.5,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.8,
        stars: 3,
      },
      {
        name: 'Orbital Rings',
        preset: 'Cosmic Indigo',
        mode: 'flowlines',
        duration: 70,
        symmetry: 12,
        complexity: 4,
        glow: 5,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.4,
        stars: 4,
      },
      {
        name: 'Sacred Lines',
        preset: 'Violet Portal',
        mode: 'flowsacred',
        duration: 70,
        symmetry: 12,
        complexity: 6,
        glow: 6,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.6,
        stars: 3,
      },
      {
        name: 'Knot Return',
        preset: 'Cosmic Indigo',
        mode: 'flowlines',
        duration: 70,
        symmetry: 12,
        complexity: 4,
        glow: 5,
        breathSpeed: 0.4,
        intensity: 8,
        particles: 9,
        luminous: 2.4,
        stars: 4,
      },
    ],
  },
];

/* ── Particle helpers ───────────────────────────────────────── */

function makeDots(n: number): Dot[] {
  return Array.from({ length: n }, () => ({
    a: Math.random() * Math.PI * 2,
    r: Math.random() * 0.65,
    s: 0.0007 + Math.random() * 0.0013,
    sz: 0.7 + Math.random() * 1.5,
    op: 0.3 + Math.random() * 0.55,
    jt: (Math.random() - 0.5) * 0.0008,
  }));
}

/* ── Three.js helpers ────────────────────────────────────────── */

function hdrColor(rgb: [number, number, number], iF: number, mult = 1.8): THREE.Color {
  return new THREE.Color(
    (rgb[0] / 255) * iF * mult,
    (rgb[1] / 255) * iF * mult,
    (rgb[2] / 255) * iF * mult,
  );
}

function lineMat(color: THREE.Color, opacity = 0.7): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function ptsMat(color: THREE.Color, size: number, opacity = 0.8): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: false,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

let _circleTex: THREE.Texture | null = null;
function getCircleTex(): THREE.Texture {
  if (_circleTex) return _circleTex;
  const sz = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = sz;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, sz, sz);
  _circleTex = new THREE.CanvasTexture(canvas);
  return _circleTex;
}

function circlePtsMat(color: THREE.Color, size: number, opacity = 0.8): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    color,
    size,
    map: getCircleTex(),
    sizeAttenuation: false,
    transparent: true,
    opacity,
    alphaTest: 0.01,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function circleGeo(segments = 96): THREE.BufferGeometry {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts[i * 3] = Math.cos(a);
    pts[i * 3 + 1] = Math.sin(a);
    pts[i * 3 + 2] = 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  return geo;
}

function disposeGroup(g: THREE.Group): void {
  g.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.Line ||
      obj instanceof THREE.Points ||
      obj instanceof THREE.LineSegments
    ) {
      obj.geometry.dispose();
      const m = obj.material as THREE.Material | THREE.Material[];
      Array.isArray(m) ? m.forEach((x) => x.dispose()) : m.dispose();
    }
  });
}

function updateMat(
  obj: THREE.Object3D,
  rgb: [number, number, number],
  iF: number,
  mult = 1.8,
): void {
  const mat = (obj as THREE.Line | THREE.Points).material as
    | THREE.LineBasicMaterial
    | THREE.PointsMaterial;
  if (mat?.color)
    mat.color.setRGB(
      (rgb[0] / 255) * iF * mult,
      (rgb[1] / 255) * iF * mult,
      (rgb[2] / 255) * iF * mult,
    );
}

function buildRings(
  count: number,
  R: number,
  rgb: [number, number, number],
  iF: number,
): THREE.Group {
  const g = new THREE.Group();
  for (let i = 1; i <= count; i++) {
    const brightness = (0.2 + (i / count) * 0.8) * iF;
    const ring = new THREE.Line(circleGeo(96), lineMat(hdrColor(rgb, brightness, 2), 1.0));
    ring.scale.setScalar(R * (i / count));
    ring.userData.baseScale = R * (i / count);
    ring.userData.ri = i / count;
    g.add(ring);
  }
  return g;
}

function updateRings(
  ringsGroup: THREE.Group,
  bs: number,
  rgb: [number, number, number],
  iF: number,
): void {
  ringsGroup.children.forEach((c) => {
    c.scale.setScalar((c as THREE.Line).userData.baseScale * bs);
    updateMat(c as THREE.Object3D, rgb, (c as THREE.Line).userData.ri * iF * 0.8, 2);
  });
}

function buildParticles(
  dots: Dot[],
  R: number,
  rgb: [number, number, number],
  iF: number,
  scale: number,
): THREE.Points {
  const N = dots.length;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = Math.cos(dots[i].a) * dots[i].r * R;
    pos[i * 3 + 1] = Math.sin(dots[i].a) * dots[i].r * R;
    pos[i * 3 + 2] = 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, ptsMat(hdrColor(rgb, iF, 1.5), 1.5 * scale, 0.7));
}

function updateParticles(
  particles: THREE.Points,
  dots: Dot[],
  breathSpeed: number,
  R: number,
  rgb: [number, number, number],
  iF: number,
): void {
  const TAU = Math.PI * 2;
  const pos = particles.geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    d.r += d.s * (0.25 + breathSpeed * 0.15);
    d.a += d.jt;
    if (d.r > 1.08) {
      d.r = Math.random() * 0.18;
      d.a = Math.random() * TAU;
    }
    const fade = Math.max(0, 1 - d.r * 0.85);
    pos[i * 3] = Math.cos(d.a) * d.r * R;
    pos[i * 3 + 1] = Math.sin(d.a) * d.r * R;
    (particles.material as THREE.PointsMaterial).opacity = fade * iF * 0.7;
  }
  particles.geometry.attributes.position.needsUpdate = true;
  updateMat(particles, rgb, iF, 1.5);
}

function buildCenter(rgb: [number, number, number], iF: number, _scale: number): THREE.Group {
  const g = new THREE.Group();
  // Concentric rings bloom into a soft glowing disc — no square artifact
  const radii = [2, 5, 9, 15];
  for (let i = 0; i < radii.length; i++) {
    const brightness = iF * 7 * (1 - i * 0.2);
    const ring = new THREE.Line(circleGeo(32), lineMat(hdrColor(rgb, brightness, 2.2), 1.0));
    ring.scale.setScalar(radii[i]);
    ring.userData.baseR = radii[i];
    g.add(ring);
  }
  return g;
}

function updateCenter(
  g: THREE.Group,
  breath: number,
  rgb: [number, number, number],
  iF: number,
  _scale: number,
): void {
  g.children.forEach((ring, i) => {
    const baseR = ring.userData.baseR as number;
    ring.scale.setScalar(baseR * (0.82 + breath * 0.18));
    updateMat(ring as THREE.Object3D, rgb, iF * 7 * (1 - i * 0.2) * (0.65 + breath * 0.35), 2.2);
  });
}

/* ── Ripple ring system ─────────────────────────────────────── */

function updateRippleRings(
  scene: THREE.Scene,
  rings: THREE.Line[],
  ripples: Ripple[],
  t: number,
  cfg: Cfg,
  R: number,
): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;

  // Expire old ripple rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const age = (t - rings[i].userData.born) / 1800;
    if (age > 1) {
      scene.remove(rings[i]);
      rings[i].geometry.dispose();
      (rings[i].material as THREE.Material).dispose();
      rings.splice(i, 1);
    }
  }

  // Spawn rings for new ripples (those not yet represented)
  for (const rp of ripples) {
    if (rings.find((r) => r.userData.rippleId === rp.born)) continue;
    const geo = circleGeo(64);
    const mat = lineMat(hdrColor([rr, gg, bb], 0.8, 1.5), 0.6);
    const ring = new THREE.Line(geo, mat);
    ring.position.set(rp.x - (scene.userData.W ?? 0) / 2, -(rp.y - (scene.userData.H ?? 0) / 2), 0);
    ring.scale.setScalar(1);
    ring.userData.born = rp.born;
    ring.userData.rippleId = rp.born;
    scene.add(ring);
    rings.push(ring);
  }

  // Animate rings
  for (const ring of rings) {
    const age = (t - ring.userData.born) / 1800;
    ring.scale.setScalar(age * R * 1.8);
    const mat = ring.material as THREE.LineBasicMaterial;
    mat.opacity = (1 - age) * 0.55;
    updateMat(ring, [rr, gg, bb], 0.8, 1.5);
  }
}

/* ── Build + update dispatch ────────────────────────────────── */

function buildModeGroup(cfg: Cfg, R: number): THREE.Group {
  switch (cfg.mode) {
    case 'burst':
      return buildBurst(cfg, R);
    case 'lissajous':
      return buildLissajous(cfg, R);
    case 'lissajous2':
      return buildLissajousExpand(cfg, R);
    case 'lissajous3d':
      return buildLissajous3D(cfg, R);
    case 'tknot3d':
      return buildTknot3D(cfg, R);
    case 'lorenz3d':
      return buildLorenz3D(cfg, R);
    case 'rose3d':
      return buildRose3D(cfg, R);
    case 'helix3d':
      return buildHelix3D(cfg, R);
    case 'orbital3d':
      return buildOrbital3D(cfg, R);
    case 'firework3d':
      return buildFirework3D(cfg, R);
    case 'fibonacci3d':
      return buildFibonacci3D(cfg, R);
    case 'yantra3d':
      return buildYantra3D(cfg, R);
    case 'rainbow3d':
      return buildRainbow3D(cfg, R);
    case 'golden':
      return buildGolden(cfg, R);
    case 'kaleidoscope':
      return buildKaleidoscope(cfg, R);
    case 'torus':
      return buildTorus(cfg, R);
    case 'tunnel':
      return buildTunnel(cfg, R);
    case 'vitral':
      return buildVitral(cfg, R);
    case 'fibonacci':
      return buildFibonacci(cfg, R);
    case 'clifford':
      return buildClifford(cfg, R);
    case 'hypercube':
      return buildHypercube(cfg, R);
    case 'warp':
      return buildWarp(cfg, R);
    case 'lorenz':
      return buildLorenz(cfg, R);
    case 'knot':
      return buildKnot(cfg, R);
    case 'orbital':
      return buildOrbital(cfg, R);
    case 'geodesic':
      return buildGeodesic(cfg, R);
    case 'rainbow':
      return buildRainbow(cfg, R);
    case 'cathedral':
      return buildCathedral(cfg, R);
    case 'islamic':
      return buildIslamic(cfg, R);
    case 'yantra':
      return buildYantra(cfg, R);
    case 'celtic':
      return buildCeltic(cfg, R);
    case 'bloom':
      return buildBloom(cfg, R);
    case 'lava':
      return buildLava(cfg, R);
    case 'spire':
      return buildSpire(cfg, R);
    case 'prism':
      return buildPrism(cfg, R);
    case 'prism3d':
      return buildPrism3D(cfg, R);
    case 'liquid':
      return buildLiquid(cfg, R);
    case 'cells':
      return buildCells(cfg, R);
    case 'current':
      return buildCurrent(cfg, R);
    case 'currentscales':
    case 'cyclonetiles':
    case 'eddylace':
    case 'magneticsand':
    case 'gravity':
    case 'fire':
      return buildCurrentTexture(cfg, R);
    case 'flowfield':
    case 'flowwalkers':
    case 'flowsacred':
    case 'flowdance':
    case 'flowsands':
    case 'flowbutterfly':
    case 'flowlines':
      return buildFlowField(cfg, R);
    case 'plasma':
      return buildPlasma(cfg, R);
    case 'nebula':
      return buildNebula(cfg, R);
    case 'globe':
      return buildGlobe(cfg, R);
    case 'current3d':
      return buildCurrent3D(cfg, R);
    case 'matrix':
      return buildMatrix(cfg, R);
    case 'matrix3d':
      return buildMatrix3D(cfg, R);
    case 'archetypesun':
      return buildArchetypeSun(cfg, R);
    case 'braintopography':
      return buildBrainTopography(cfg, R);
    case 'walkingfigure':
      return buildWalkingFigure(cfg, R);
    case 'dotwalker':
      return buildDotWalker(cfg, R);
    case 'missionsun':
    case 'dotsunfire':
    case 'dotsunoutward':
    case 'dotalchemicalsun':
    case 'dotheart':
    case 'dotphoenix':
    case 'dotbrain':
    case 'neuronweb':

    case 'embrace':
    case 'tripnumber1':
      return buildDotSymbolField(cfg, R);
    case 'dottunnel':
    case 'swirldottunnel':
    case 'linetunnel3d':
    case 'dotroad':
      return buildDepthJourney(cfg, R);
    case 'pulse':
    case 'tripnumber2':
      return buildPulse(cfg, R);
    case 'tripnumber3':
      return buildTriangleYantraTrip(cfg, R);
    case 'buddhaboycurrents':
      return buildBuddhaBoyCurrents(cfg, R);
    case 'emotion':
      return buildEmotion(cfg, R);
    case 'constellation':
      return buildConstellation(cfg, R);
    case 'drift':
      return buildDrift(cfg, R);
    case 'cbloom':
      return buildCBloom(cfg, R);
    case 'orbit':
      return buildOrbit(cfg, R);
    case 'weave':
      return buildWeave(cfg, R);
    case 'chaostri3d':
    case 'chaostrisphere':
      return buildChaostri3d(cfg, R);
    case 'treeoflife':
      return buildTreeoflife(cfg, R);
    case 'treeoflife3d':
      return buildTreeoflife3d(cfg, R);
    case 'breath':
    case 'stream':
    case 'entropy':
    case 'wordneon':
    case 'hopefear':
    case 'wordecho':
    case 'wordparticle':
    case 'wordweave':
    case 'eclipse':
    case 'yinyang':
    case 'volcano':
    case 'atomicexplosion':
    case 'scriptures':
    case 'scripturesjp':
    case 'touchpreset':
    case 'metamorph':
    case 'chrysalis':
    case 'chrysalisrings':
    case 'breathform':
    case 'clock3d':
    case 'atomlight':
    case 'butterfly':
    case 'orbitdance':
    case 'ripplemorph':
    case 'kaleido3d':
    case 'mirrortunnel':
    case 'heartwave':
    case 'eyemorph':
    case 'heartdance':
    case 'infinitedive':
    case 'musicdots':
    case 'musicnebula':
    case 'musiclattice':
      return buildCanvasMode(cfg, R);
    case 'sinmorph3d':
      return buildSinMorph3D(cfg, R);
    case 'entropy3d':
      return buildEntropy3D(cfg, R);
    case 'embf3d':
      return buildEmbf3D(cfg, R);
    case 'pyramid3d':
      return buildPyramid3D(cfg, R);
    case 'clockorbit3d':
      return buildClockOrbit3D(cfg, R);
    default:
      return buildSacred(cfg, R);
  }
}

function updateModeGroup(group: THREE.Group, cfg: Cfg, dots: Dot[], t: number, R: number): void {
  switch (cfg.mode) {
    case 'burst':
      updateBurst(group, cfg, t, R);
      break;
    case 'lissajous':
      updateLissajous(group, cfg, t, R);
      break;
    case 'lissajous2':
      updateLissajousExpand(group, cfg, t, R);
      break;
    case 'lissajous3d':
      updateLissajous3D(group, cfg, t, R);
      break;
    case 'tknot3d':
      updateTknot3D(group, cfg, t, R);
      break;
    case 'lorenz3d':
      updateLorenz3D(group, cfg, t, R);
      break;
    case 'rose3d':
      updateRose3D(group, cfg, t, R);
      break;
    case 'helix3d':
      updateHelix3D(group, cfg, t, R);
      break;
    case 'orbital3d':
      updateOrbital3D(group, cfg, t, R);
      break;
    case 'firework3d':
      updateFirework3D(group, cfg, t, R);
      break;
    case 'fibonacci3d':
      updateFibonacci3D(group, cfg, t, R);
      break;
    case 'yantra3d':
      updateYantra3D(group, cfg, t, R);
      break;
    case 'rainbow3d':
      updateRainbow3D(group, cfg, t, R);
      break;
    case 'golden':
      updateGolden(group, cfg, t, R);
      break;
    case 'kaleidoscope':
      updateKaleidoscope(group, cfg, t, R);
      break;
    case 'torus':
      updateTorus(group, cfg, t, R);
      break;
    case 'tunnel':
      updateTunnel(group, cfg, t, R);
      break;
    case 'vitral':
      updateVitral(group, cfg, t, R);
      break;
    case 'fibonacci':
      updateFibonacci(group, cfg, t, R);
      break;
    case 'clifford':
      updateClifford(group, cfg, t, R);
      break;
    case 'hypercube':
      updateHypercube(group, cfg, t, R);
      break;
    case 'warp':
      updateWarp(group, cfg, t, R);
      break;
    case 'lorenz':
      updateLorenz(group, cfg, t, R);
      break;
    case 'knot':
      updateKnot(group, cfg, t, R);
      break;
    case 'orbital':
      updateOrbital(group, cfg, t, R);
      break;
    case 'geodesic':
      updateGeodesic(group, cfg, t, R);
      break;
    case 'rainbow':
      updateRainbow(group, cfg, t, R);
      break;
    case 'cathedral':
      updateCathedral(group, cfg, t, R);
      break;
    case 'islamic':
      updateIslamic(group, cfg, t, R);
      break;
    case 'yantra':
      updateYantra(group, cfg, t, R);
      break;
    case 'celtic':
      updateCeltic(group, cfg, t, R);
      break;
    case 'bloom':
      updateBloom(group, cfg, t, R);
      break;
    case 'lava':
      updateLava(group, cfg, t, R);
      break;
    case 'spire':
      updateSpire(group, cfg, t, R);
      break;
    case 'prism':
      updatePrism(group, cfg, t, R);
      break;
    case 'prism3d':
      updatePrism3D(group, cfg, t, R);
      break;
    case 'liquid':
      updateLiquid(group, cfg, t, R);
      break;
    case 'cells':
      updateCells(group, cfg, t, R);
      break;
    case 'current':
      updateCurrent(group, cfg, t, R);
      break;
    case 'currentscales':
    case 'cyclonetiles':
    case 'eddylace':
    case 'magneticsand':
    case 'gravity':
    case 'fire':
      updateCurrentTexture(group, cfg, t, R);
      break;
    case 'flowfield':
    case 'flowwalkers':
    case 'flowsacred':
    case 'flowdance':
    case 'flowsands':
    case 'flowbutterfly':
    case 'flowlines':
      updateFlowField(group, cfg, t, R);
      break;
    case 'plasma':
      updatePlasma(group, cfg, t, R);
      break;
    case 'nebula':
      updateNebula(group, cfg, t, R);
      break;
    case 'globe':
      updateGlobe(group, cfg, t, R);
      break;
    case 'current3d':
      updateCurrent3D(group, cfg, t, R);
      break;
    case 'matrix':
      updateMatrix(group, cfg, t, R);
      break;
    case 'matrix3d':
      updateMatrix3D(group, cfg, t, R);
      break;
    case 'archetypesun':
      updateArchetypeSun(group, cfg, t, R);
      break;
    case 'braintopography':
      updateBrainTopography(group, cfg, t, R);
      break;
    case 'walkingfigure':
      updateWalkingFigure(group, cfg, t, R);
      break;
    case 'dotwalker':
      updateDotWalker(group, cfg, t, R);
      break;
    case 'missionsun':
    case 'dotsunfire':
    case 'dotsunoutward':
    case 'dotalchemicalsun':
    case 'dotheart':
    case 'dotphoenix':
    case 'dotbrain':
    case 'neuronweb':

    case 'embrace':
    case 'tripnumber1':
      updateDotSymbolField(group, cfg, t, R);
      break;
    case 'dottunnel':
    case 'swirldottunnel':
    case 'linetunnel3d':
    case 'dotroad':
      updateDepthJourney(group, cfg, t, R);
      break;
    case 'pulse':
    case 'tripnumber2':
      updatePulse(group, cfg, t, R);
      break;
    case 'tripnumber3':
      updateTriangleYantraTrip(group, cfg, t, R);
      break;
    case 'buddhaboycurrents':
      updateBuddhaBoyCurrents(group, cfg, t, R);
      break;
    case 'emotion':
      updateEmotion(group, cfg, t, R);
      break;
    case 'constellation':
      updateConstellation(group, cfg, t, R);
      break;
    case 'drift':
      updateDrift(group, cfg, t, R);
      break;
    case 'cbloom':
      updateCBloom(group, cfg, t, R);
      break;
    case 'orbit':
      updateOrbit(group, cfg, t, R);
      break;
    case 'weave':
      updateWeave(group, cfg, t, R);
      break;
    case 'chaostri3d':
    case 'chaostrisphere':
      updateChaostri3d(group, cfg, t, R);
      break;
    case 'treeoflife':
      updateTreeoflife(group, cfg, t, R);
      break;
    case 'treeoflife3d':
      updateTreeoflife3d(group, cfg, t, R);
      break;
    case 'breath':
    case 'stream':
    case 'entropy':
    case 'wordneon':
    case 'hopefear':
    case 'wordecho':
    case 'wordparticle':
    case 'wordweave':
    case 'eclipse':
    case 'yinyang':
    case 'volcano':
    case 'atomicexplosion':
    case 'scriptures':
    case 'scripturesjp':
    case 'touchpreset':
    case 'metamorph':
    case 'chrysalis':
    case 'chrysalisrings':
    case 'breathform':
    case 'clock3d':
    case 'atomlight':
    case 'butterfly':
    case 'orbitdance':
    case 'ripplemorph':
    case 'kaleido3d':
    case 'mirrortunnel':
    case 'heartwave':
    case 'eyemorph':
    case 'heartdance':
    case 'infinitedive':
    case 'musicdots':
    case 'musicnebula':
    case 'musiclattice':
      updateCanvasMode(group, cfg, t, R);
      break;
    case 'sinmorph3d':
      updateSinMorph3D(group, cfg, t, R);
      break;
    case 'entropy3d':
      updateEntropy3D(group, cfg, t, R);
      break;
    case 'embf3d':
      updateEmbf3D(group, cfg, t, R);
      break;
    case 'pyramid3d':
      updatePyramid3D(group, cfg, t, R);
      break;
    case 'clockorbit3d':
      updateClockOrbit3D(group, cfg, t, R);
      break;
    default:
      updateSacred(group, cfg, dots, t, R);
      break;
  }
}

/* ── SACRED mode ────────────────────────────────────────────── */

function buildSacred(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.round(cfg.symmetry);
  const layers = Math.max(1, Math.round(cfg.complexity));
  const TAU = Math.PI * 2;
  const scale = R / 210;

  const group = new THREE.Group();

  // Rings
  const rings = buildRings(layers + 3, R, [rr, gg, bb], iF);
  rings.userData.tag = 'rings';
  group.add(rings);

  // Radial guide lines
  const guidePos = new Float32Array(sym * 2 * 3);
  for (let s = 0; s < sym; s++) {
    const a = (s / sym) * TAU;
    const base = s * 6;
    guidePos[base] = Math.cos(a) * R * 0.08;
    guidePos[base + 1] = Math.sin(a) * R * 0.08;
    guidePos[base + 2] = 0;
    guidePos[base + 3] = Math.cos(a) * R;
    guidePos[base + 4] = Math.sin(a) * R;
    guidePos[base + 5] = 0;
  }
  const guideGeo = new THREE.BufferGeometry();
  guideGeo.setAttribute('position', new THREE.BufferAttribute(guidePos, 3));
  const guideLines = new THREE.LineSegments(
    guideGeo,
    lineMat(hdrColor([rr, gg, bb], iF * 0.2, 1.5), 1.0),
  );
  guideLines.userData.tag = 'guides';
  group.add(guideLines);

  // Petal layers
  const petalLayers = Math.max(1, Math.round(layers * 0.7));
  for (let layer = 1; layer <= petalLayers; layer++) {
    const outerR = R * (layer / (petalLayers + 1));
    const innerR = outerR * 0.3;
    const pw = (TAU / sym) * 0.35;
    const spw = Math.sin(pw);
    const petalGroup = new THREE.Group();
    petalGroup.userData.tag = 'petals';
    petalGroup.userData.layer = layer;
    petalGroup.userData.baseOuterR = outerR;
    petalGroup.userData.dir = layer % 2 === 0 ? 1 : -1;

    for (let s = 0; s < sym; s++) {
      const ang = (s / sym) * TAU;
      // Sample bezier petal (two cubic bezier curves)
      const pts: number[] = [];
      const N = 20;
      // Curve 1: from (0, innerR) to (0, outerR)
      for (let k = 0; k <= N; k++) {
        const ti = k / N;
        const mt = 1 - ti;
        const x =
          mt ** 3 * 0 +
          3 * mt ** 2 * ti * (outerR * spw) +
          3 * mt * ti ** 2 * (outerR * spw) +
          ti ** 3 * 0;
        const y =
          mt ** 3 * innerR +
          3 * mt ** 2 * ti * (outerR * 0.55) +
          3 * mt * ti ** 2 * (outerR * 0.88) +
          ti ** 3 * outerR;
        pts.push(x, y, 0);
      }
      // Curve 2: from (0, outerR) back to (0, innerR)
      for (let k = 0; k <= N; k++) {
        const ti = k / N;
        const mt = 1 - ti;
        const x =
          mt ** 3 * 0 +
          3 * mt ** 2 * ti * (-outerR * spw) +
          3 * mt * ti ** 2 * (-outerR * spw) +
          ti ** 3 * 0;
        const y =
          mt ** 3 * outerR +
          3 * mt ** 2 * ti * (outerR * 0.88) +
          3 * mt * ti ** 2 * (outerR * 0.55) +
          ti ** 3 * innerR;
        pts.push(x, y, 0);
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      const petal = new THREE.Line(
        pGeo,
        lineMat(hdrColor([rr, gg, bb], iF * (0.5 + layer * 0.1), 1.8), 1.0),
      );
      petal.rotation.z = ang;
      petalGroup.add(petal);
    }
    group.add(petalGroup);
  }

  // Orbital dot layers
  const orbLayers = Math.min(layers, 7);
  for (let layer = 1; layer <= orbLayers; layer++) {
    const orbitR = R * (layer / (orbLayers + 1));
    const orbitPos = new Float32Array(sym * 3);
    for (let d = 0; d < sym; d++) {
      const a = (d / sym) * TAU;
      orbitPos[d * 3] = Math.cos(a) * orbitR;
      orbitPos[d * 3 + 1] = Math.sin(a) * orbitR;
      orbitPos[d * 3 + 2] = 0;
    }
    const oGeo = new THREE.BufferGeometry();
    oGeo.setAttribute('position', new THREE.BufferAttribute(orbitPos, 3));
    const orbit = new THREE.Points(oGeo, ptsMat(hdrColor([rr, gg, bb], iF, 2), 2.5 * scale, 0.85));
    orbit.userData.tag = 'orbital';
    orbit.userData.orbitR = orbitR;
    orbit.userData.dir = layer % 2 === 0 ? 1 : -1;
    group.add(orbit);
  }

  // Floating particles
  const particles = buildParticles(
    makeDots(Math.round(cfg.particles * 40 + 20)),
    R,
    [rr, gg, bb],
    iF,
    scale,
  );
  particles.userData.tag = 'particles';
  group.add(particles);

  // Central dot
  const center = buildCenter([rr, gg, bb], iF, scale);
  center.userData.tag = 'center';
  group.add(center);

  return group;
}

function updateSacred(group: THREE.Group, cfg: Cfg, dots: Dot[], t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.9 + breath * 0.1;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'rings') {
      updateRings(child as THREE.Group, bs, [rr, gg, bb], iF);
    } else if (tag === 'guides') {
      child.rotation.z = t * 0.00004;
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF * 0.2, 1.5);
    } else if (tag === 'petals') {
      const pg = child as THREE.Group;
      const dir = pg.userData.dir as number;
      pg.rotation.z = t * 0.00018 * dir;
      pg.scale.setScalar(bs);
      pg.children.forEach((p) => updateMat(p as THREE.Object3D, [rr, gg, bb], iF * 0.8, 1.8));
    } else if (tag === 'orbital') {
      const orbit = child as THREE.Points;
      const dir = orbit.userData.dir as number;
      orbit.rotation.z = t * 0.00025 * cfg.breathSpeed * dir;
      const mat = orbit.material as THREE.PointsMaterial;
      mat.opacity = (0.45 + breath * 0.35) * iF;
      mat.size = (1.5 + breath * 1.5) * scale;
      updateMat(orbit, [rr, gg, bb], iF, 2);
    } else if (tag === 'particles') {
      updateParticles(child as THREE.Points, dots, cfg.breathSpeed, R, [rr, gg, bb], iF);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF, scale);
    }
  }
}

/* ── BURST mode ─────────────────────────────────────────────── */

function buildBurst(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['DMT Vision'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.round(cfg.symmetry);
  const layers = Math.max(1, Math.round(cfg.complexity));
  const TAU = Math.PI * 2;
  const scale = R / 210;
  const lineCount = sym * (8 + layers * 4);

  const group = new THREE.Group();

  // Burst lines (many thin lines from center to edge)
  const burstPos = new Float32Array(lineCount * 2 * 3);
  const angles = new Float32Array(lineCount);
  for (let i = 0; i < lineCount; i++) {
    angles[i] = (i / lineCount) * TAU;
    burstPos[i * 6 + 3] = Math.cos(angles[i]) * R;
    burstPos[i * 6 + 4] = Math.sin(angles[i]) * R;
  }
  const burstGeo = new THREE.BufferGeometry();
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
  const burstLines = new THREE.LineSegments(
    burstGeo,
    lineMat(hdrColor([rr, gg, bb], iF * 0.5, 1.5), 1.0),
  );
  burstLines.userData.angles = angles;
  burstLines.userData.lineCount = lineCount;
  burstLines.userData.tag = 'burstLines';
  group.add(burstLines);

  // Main symmetry lines (brighter)
  const mainPos = new Float32Array(sym * 2 * 3);
  for (let s = 0; s < sym; s++) {
    const a = (s / sym) * TAU;
    mainPos[s * 6 + 3] = Math.cos(a) * R;
    mainPos[s * 6 + 4] = Math.sin(a) * R;
  }
  const mainGeo = new THREE.BufferGeometry();
  mainGeo.setAttribute('position', new THREE.BufferAttribute(mainPos, 3));
  const mainLines = new THREE.LineSegments(mainGeo, lineMat(hdrColor([rr, gg, bb], iF, 2.5), 1.0));
  mainLines.userData.tag = 'mainLines';
  group.add(mainLines);

  // Rings
  const rings = buildRings(Math.round(6 + layers * 2), R, [rr, gg, bb], iF);
  rings.userData.tag = 'rings';
  group.add(rings);

  // Central dot
  const center = buildCenter([rr, gg, bb], iF, scale);
  center.userData.tag = 'center';
  group.add(center);

  return group;
}

function updateBurst(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['DMT Vision'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.92 + breath * 0.08;
  const rotOffset = t * 0.00006;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'burstLines') {
      const bl = child as THREE.LineSegments;
      const positions = bl.geometry.attributes.position.array as Float32Array;
      const blAngles = bl.userData.angles as Float32Array;
      const lineCount = bl.userData.lineCount as number;
      for (let i = 0; i < lineCount; i++) {
        const ang = blAngles[i] + rotOffset;
        const phase = Math.sin(i * 0.3917 + t * 0.0003);
        const len = R * bs * (0.75 + phase * 0.25);
        positions[i * 6 + 3] = Math.cos(ang) * len;
        positions[i * 6 + 4] = Math.sin(ang) * len;
      }
      bl.geometry.attributes.position.needsUpdate = true;
      updateMat(bl, [rr, gg, bb], iF * 0.5, 1.5);
    } else if (tag === 'mainLines') {
      child.rotation.z = t * 0.00004;
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF, 2.5);
    } else if (tag === 'rings') {
      updateRings(child as THREE.Group, bs, [rr, gg, bb], iF);
      (child as THREE.Group).rotation.z = t * 0.000012;
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF, scale);
    }
  }
}

/* ── LISSAJOUS mode ─────────────────────────────────────────── */

const LISSAJOUS_RATIOS: [number, number, number][] = [
  [1, 2, 0],
  [2, 3, Math.PI / 4],
  [3, 4, Math.PI / 6],
  [1, 3, Math.PI / 3],
  [2, 5, Math.PI / 2],
];

function buildLissajous(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.round(cfg.symmetry);
  const layers = Math.max(1, Math.round(cfg.complexity));
  const TAU = Math.PI * 2;
  const scale = R / 210;

  const group = new THREE.Group();
  const usedRatios = LISSAJOUS_RATIOS.slice(0, Math.min(layers + 1, LISSAJOUS_RATIOS.length));
  const STEPS = 360;

  for (let li = 0; li < usedRatios.length; li++) {
    const [a, b, delta0] = usedRatios[li];
    const curveGroup = new THREE.Group();
    curveGroup.userData.tag = 'curve';
    curveGroup.userData.a = a;
    curveGroup.userData.b = b;
    curveGroup.userData.delta0 = delta0;
    curveGroup.userData.li = li;

    for (let s = 0; s < sym; s++) {
      const pts = new Float32Array((STEPS + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const opacity = (0.35 - li * 0.04) * iF;
      const curve = new THREE.Line(
        geo,
        lineMat(hdrColor([rr, gg, bb], Math.max(0.1, opacity), 2), 1.0),
      );
      curve.rotation.z = (s / sym) * TAU;
      curveGroup.add(curve);
    }
    group.add(curveGroup);
  }

  // Suppress unused var warning — scale is used in buildCenter call below
  void scale;

  const center = buildCenter([rr, gg, bb], iF, R / 210);
  center.userData.tag = 'center';
  group.add(center);
  return group;
}

function updateLissajous(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.88 + breath * 0.12;
  const STEPS = 360;
  const TAU = Math.PI * 2;

  for (const child of group.children) {
    if (child.userData.tag === 'curve') {
      const cg = child as THREE.Group;
      const a = cg.userData.a as number;
      const b = cg.userData.b as number;
      const delta0 = cg.userData.delta0 as number;
      const li = cg.userData.li as number;
      const delta = delta0 + t * 0.00025 * cfg.breathSpeed * (li % 2 === 0 ? 1 : -0.7);

      cg.children.forEach((curve) => {
        const pos = (curve as THREE.Line).geometry.attributes.position.array as Float32Array;
        for (let step = 0; step <= STEPS; step++) {
          const tp = (step / STEPS) * TAU;
          pos[step * 3] = R * bs * Math.sin(a * tp + delta);
          pos[step * 3 + 1] = R * bs * Math.sin(b * tp);
          pos[step * 3 + 2] = 0;
        }
        (curve as THREE.Line).geometry.attributes.position.needsUpdate = true;
        updateMat(curve as THREE.Object3D, [rr, gg, bb], (0.35 - li * 0.04) * iF, 2);
      });
    } else if (child.userData.tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF, scale);
    }
  }
}

/* ── LISSAJOUS EXPAND mode — shells flow outward continuously ── */

const LIS2_SHELLS = 14;

function buildLissajousExpand(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.max(1, Math.round(cfg.symmetry));
  const TAU = Math.PI * 2;
  const STEPS = 360;
  const group = new THREE.Group();

  for (let i = 0; i < LIS2_SHELLS; i++) {
    const shellGroup = new THREE.Group();
    shellGroup.userData.tag = 'lis2shell';
    shellGroup.userData.shellIdx = i;
    for (let s = 0; s < sym; s++) {
      const pts = new Float32Array((STEPS + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const curve = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], iF * 0.3, 2.2), 1.0));
      curve.rotation.z = (s / sym) * TAU;
      shellGroup.add(curve);
    }
    group.add(shellGroup);
  }
  return group;
}

function updateLissajousExpand(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const STEPS = 360;
  const TAU = Math.PI * 2;
  const R_max = R * 2.6;
  const speed = cfg.breathSpeed * 0.000028;

  const ratioIdx = Math.min(
    LISSAJOUS_RATIOS.length - 1,
    Math.max(0, Math.round(cfg.complexity) - 1),
  );
  const [a, b, delta0] = LISSAJOUS_RATIOS[ratioIdx];
  // Delta slowly evolves so the shape morphs over time
  const delta = delta0 + t * 0.00006 * cfg.breathSpeed;

  for (const child of group.children) {
    if (child.userData.tag !== 'lis2shell') continue;
    const shellIdx = child.userData.shellIdx as number;
    const rawPhase = (shellIdx / LIS2_SHELLS + t * speed) % 1.0;
    const frac = rawPhase ** 0.52;
    const r = R_max * frac;
    // Fade in fast from center, fade out gently near edge
    const opacity = Math.min(1, frac * 5.0) * Math.max(0, 1 - frac * 0.82) * iF * 0.58;

    const cg = child as THREE.Group;
    cg.children.forEach((curve) => {
      const pos = (curve as THREE.Line).geometry.attributes.position.array as Float32Array;
      for (let step = 0; step <= STEPS; step++) {
        const tp = (step / STEPS) * TAU;
        pos[step * 3] = r * Math.sin(a * tp + delta);
        pos[step * 3 + 1] = r * Math.sin(b * tp);
        pos[step * 3 + 2] = 0;
      }
      (curve as THREE.Line).geometry.attributes.position.needsUpdate = true;
      updateMat(curve as THREE.Object3D, [rr, gg, bb], opacity, 2.2);
    });
  }
}

/* ── LISSAJOUS 3D mode ──────────────────────────────────────── */

function buildLissajous3D(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const layers = Math.max(1, Math.round(cfg.particles));
  const STEPS = 2400;
  const group = new THREE.Group();

  for (let li = 0; li < layers; li++) {
    const pts = new Float32Array((STEPS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const opacity = (0.7 - li * 0.08) * iF;
    const line = new THREE.Line(
      geo,
      lineMat(hdrColor([rr, gg, bb], Math.max(0.05, opacity), 2.5), 1.0),
    );
    line.userData.tag = 'trace3d';
    line.userData.li = li;
    group.add(line);
  }
  return group;
}

function updateLissajous3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const layers = Math.max(1, Math.round(cfg.particles));
  const STEPS = 2400;
  const TAU = Math.PI * 2;
  const fx = Math.max(1, Math.round(cfg.symmetry));
  const fy = Math.max(1, Math.round(cfg.complexity));
  const fz = Math.max(1, Math.round(cfg.glow));
  const speed = cfg.breathSpeed * 0.00018;
  const breath = (Math.sin(t * 0.0008 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.82 + breath * 0.18;

  for (const child of group.children) {
    if (child.userData.tag !== 'trace3d') continue;
    const li = child.userData.li as number;
    const phaseShift = (li / Math.max(1, layers - 1)) * Math.PI * 0.6;
    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;
    const phase = t * speed + phaseShift;

    for (let step = 0; step <= STEPS; step++) {
      const tp = (step / STEPS) * TAU;
      pos[step * 3] = R * bs * Math.sin(fx * tp + phase);
      pos[step * 3 + 1] = R * bs * Math.sin(fy * tp);
      pos[step * 3 + 2] = R * bs * Math.sin(fz * tp + phase * 0.71);
    }
    line.geometry.attributes.position.needsUpdate = true;
    updateMat(child as THREE.Object3D, [rr, gg, bb], (0.7 - li * 0.08) * iF, 2.5);
  }
}

/* ── TORUS KNOT 3D ──────────────────────────────────────────── */

function buildTknot3D(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const traces = Math.max(1, Math.round(cfg.particles));
  const STEPS = 1800;
  const group = new THREE.Group();
  for (let ti = 0; ti < traces; ti++) {
    const pts = new Float32Array((STEPS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const opacity = (0.75 - ti * 0.1) * iF;
    const line = new THREE.Line(
      geo,
      lineMat(hdrColor([rr, gg, bb], Math.max(0.04, opacity), 2.5), 1.0),
    );
    line.userData.tag = 'tknot';
    line.userData.ti = ti;
    group.add(line);
  }
  return group;
}

function updateTknot3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const p = Math.max(2, Math.round(cfg.symmetry));
  const q = Math.max(2, Math.round(cfg.complexity));
  const traces = Math.max(1, Math.round(cfg.particles));
  const tubeRatio = 0.22 + (cfg.glow / 10) * 0.42;
  const STEPS = 1800;
  const TAU = Math.PI * 2;
  const speed = cfg.breathSpeed * 0.00005;
  const breath = (Math.sin(t * 0.0007 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.78 + breath * 0.22;
  const Rmaj = R * bs * 0.68;
  const Rmin = Rmaj * tubeRatio;

  for (const child of group.children) {
    if (child.userData.tag !== 'tknot') continue;
    const ti = child.userData.ti as number;
    const phaseShift = (ti / Math.max(1, traces)) * 0.18;
    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;
    const phase = t * speed + phaseShift;

    for (let step = 0; step <= STEPS; step++) {
      const ang = (step / STEPS) * TAU + phase;
      pos[step * 3] = (Rmaj + Rmin * Math.cos(q * ang)) * Math.cos(p * ang);
      pos[step * 3 + 1] = (Rmaj + Rmin * Math.cos(q * ang)) * Math.sin(p * ang);
      pos[step * 3 + 2] = Rmin * Math.sin(q * ang);
    }
    line.geometry.attributes.position.needsUpdate = true;
    updateMat(child as THREE.Object3D, [rr, gg, bb], (0.75 - ti * 0.1) * iF, 2.5);
  }
}

/* ── LORENZ ATTRACTOR 3D ────────────────────────────────────── */

function buildLorenz3D(cfg: Cfg, R: number): THREE.Group {
  const sigma = 5 + cfg.symmetry * 1.0;
  const rho = 15 + cfg.complexity * 2.0;
  const beta = 0.5 + (cfg.glow / 10) * 2.5;
  const nPts = 7000;
  const dt = 0.007;
  let lx = 0.1,
    ly = 0,
    lz = 20;
  // burn transient
  for (let i = 0; i < 800; i++) {
    const dx = sigma * (ly - lx);
    const dy = lx * (rho - lz) - ly;
    const dz = lx * ly - beta * lz;
    lx += dx * dt;
    ly += dy * dt;
    lz += dz * dt;
  }
  const raw = new Float32Array(nPts * 3);
  for (let i = 0; i < nPts; i++) {
    raw[i * 3] = lx;
    raw[i * 3 + 1] = ly;
    raw[i * 3 + 2] = lz;
    const dx = sigma * (ly - lx);
    const dy = lx * (rho - lz) - ly;
    const dz = lx * ly - beta * lz;
    lx += dx * dt;
    ly += dy * dt;
    lz += dz * dt;
  }
  // center + normalize
  let mx = 0,
    my = 0,
    mz = 0;
  for (let i = 0; i < nPts; i++) {
    mx += raw[i * 3];
    my += raw[i * 3 + 1];
    mz += raw[i * 3 + 2];
  }
  mx /= nPts;
  my /= nPts;
  mz /= nPts;
  let maxR = 0;
  for (let i = 0; i < nPts; i++) {
    const dx = raw[i * 3] - mx,
      dy = raw[i * 3 + 1] - my,
      dz = raw[i * 3 + 2] - mz;
    maxR = Math.max(maxR, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  const sc = (R * 0.88) / Math.max(maxR, 1);
  for (let i = 0; i < nPts; i++) {
    raw[i * 3] = (raw[i * 3] - mx) * sc;
    raw[i * 3 + 1] = (raw[i * 3 + 1] - my) * sc;
    raw[i * 3 + 2] = (raw[i * 3 + 2] - mz) * sc;
  }

  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const trails = Math.max(1, Math.round(cfg.particles));
  const trailLen = Math.floor(nPts / trails);
  const group = new THREE.Group();
  group.userData.raw = raw;
  group.userData.nPts = nPts;
  group.userData.trailLen = trailLen;

  for (let ti = 0; ti < trails; ti++) {
    const pts = new Float32Array((trailLen + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const opacity = (0.7 - ti * 0.1) * iF;
    const line = new THREE.Line(
      geo,
      lineMat(hdrColor([rr, gg, bb], Math.max(0.04, opacity), 2.5), 1.0),
    );
    line.userData.tag = 'lorenz3d';
    line.userData.ti = ti;
    group.add(line);
  }
  return group;
}

function updateLorenz3D(group: THREE.Group, cfg: Cfg, t: number, _R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const raw = group.userData.raw as Float32Array | undefined;
  const nPts = group.userData.nPts as number | undefined;
  const trailLen = group.userData.trailLen as number | undefined;
  if (!raw || !nPts || !trailLen) return;

  const speed = cfg.breathSpeed * 0.08;
  const offset = Math.floor(t * speed) % nPts;

  for (const child of group.children) {
    if (child.userData.tag !== 'lorenz3d') continue;
    const ti = child.userData.ti as number;
    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;
    const start = (offset + ti * trailLen) % nPts;

    for (let i = 0; i <= trailLen; i++) {
      const idx = (start + i) % nPts;
      pos[i * 3] = raw[idx * 3];
      pos[i * 3 + 1] = raw[idx * 3 + 1];
      pos[i * 3 + 2] = raw[idx * 3 + 2];
    }
    line.geometry.attributes.position.needsUpdate = true;
    updateMat(child as THREE.Object3D, [rr, gg, bb], (0.7 - ti * 0.1) * iF, 2.5);
  }
}

/* ── ROSE 3D ────────────────────────────────────────────────── */

function buildRose3D(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const traces = Math.max(1, Math.round(cfg.particles));
  const STEPS = 1200;
  const group = new THREE.Group();
  for (let ti = 0; ti < traces; ti++) {
    const pts = new Float32Array((STEPS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const opacity = (0.7 - ti * 0.09) * iF;
    const line = new THREE.Line(
      geo,
      lineMat(hdrColor([rr, gg, bb], Math.max(0.04, opacity), 2.5), 1.0),
    );
    line.userData.tag = 'rose3d';
    line.userData.ti = ti;
    group.add(line);
  }
  return group;
}

function updateRose3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const a = Math.max(1, Math.round(cfg.symmetry));
  const b = Math.max(1, Math.round(cfg.complexity));
  const c = Math.max(1, Math.round(cfg.glow));
  const traces = Math.max(1, Math.round(cfg.particles));
  const STEPS = 1200;
  const TAU = Math.PI * 2;
  const speed = cfg.breathSpeed * 0.00014;
  const breath = (Math.sin(t * 0.0009 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.76 + breath * 0.24;

  for (const child of group.children) {
    if (child.userData.tag !== 'rose3d') continue;
    const ti = child.userData.ti as number;
    const phaseShift = (ti / Math.max(1, traces)) * Math.PI * 0.7;
    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;
    const phase = t * speed + phaseShift;

    for (let step = 0; step <= STEPS; step++) {
      const tp = (step / STEPS) * TAU * Math.max(a, b, c);
      const r = R * bs * Math.abs(Math.cos(a * tp + phase * 0.3));
      pos[step * 3] = r * Math.cos(b * tp + phase);
      pos[step * 3 + 1] = r * Math.sin(b * tp);
      pos[step * 3 + 2] = R * bs * 0.6 * Math.sin(c * tp + phase * 0.5);
    }
    line.geometry.attributes.position.needsUpdate = true;
    updateMat(child as THREE.Object3D, [rr, gg, bb], (0.7 - ti * 0.09) * iF, 2.5);
  }
}

/* ── HELIX 3D ───────────────────────────────────────────────── */

function buildHelix3D(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const strands = Math.max(1, Math.round(cfg.particles));
  const STEPS = 1000;
  const group = new THREE.Group();
  for (let si = 0; si < strands; si++) {
    const pts = new Float32Array((STEPS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const opacity = (0.72 - si * 0.08) * iF;
    const line = new THREE.Line(
      geo,
      lineMat(hdrColor([rr, gg, bb], Math.max(0.04, opacity), 2.5), 1.0),
    );
    line.userData.tag = 'helix3d';
    line.userData.si = si;
    group.add(line);
  }
  return group;
}

function updateHelix3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const strands = Math.max(1, Math.round(cfg.particles));
  const turns = Math.max(1, Math.round(cfg.symmetry));
  const bulges = Math.max(1, Math.round(cfg.complexity));
  const twist = cfg.glow / 10;
  const STEPS = 1000;
  const TAU = Math.PI * 2;
  const speed = cfg.breathSpeed * 0.00016;
  const breath = (Math.sin(t * 0.0008 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.8 + breath * 0.2;

  for (const child of group.children) {
    if (child.userData.tag !== 'helix3d') continue;
    const si = child.userData.si as number;
    const strandPhase = (si / strands) * TAU;
    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;
    const phase = t * speed;

    for (let step = 0; step <= STEPS; step++) {
      const u = (step / STEPS) * TAU * turns;
      const bulge = 1 + 0.35 * Math.cos(bulges * u + phase * 3);
      const rr2 = R * bs * 0.62 * bulge;
      const taper = Math.sin((step / STEPS) * Math.PI); // fade ends
      pos[step * 3] = rr2 * taper * Math.cos(u + strandPhase + phase);
      pos[step * 3 + 1] = rr2 * taper * Math.sin(u + strandPhase + phase);
      pos[step * 3 + 2] =
        R * bs * (step / STEPS - 0.5) * 1.6 + R * 0.22 * Math.sin(twist * TAU * u + phase * 2);
    }
    line.geometry.attributes.position.needsUpdate = true;
    updateMat(child as THREE.Object3D, [rr, gg, bb], (0.72 - si * 0.08) * iF, 2.5);
  }
}

/* ── ORBITAL 3D ─────────────────────────────────────────────── */
// Armillary-sphere / orrery: concentric inclined ring orbits

function buildOrbital3D(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Orbital Shell'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const shells = Math.max(1, Math.round(cfg.complexity));
  const orbs = Math.max(2, Math.round(cfg.symmetry));
  const STEPS = 120;
  const group = new THREE.Group();

  for (let sh = 0; sh < shells; sh++) {
    const shellR = R * 0.3 + (sh / Math.max(1, shells - 1)) * R * 0.6;
    for (let oi = 0; oi < orbs; oi++) {
      const pts = new Float32Array((STEPS + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const opacity = (0.55 - sh * 0.06) * iF;
      const line = new THREE.Line(
        geo,
        lineMat(hdrColor([rr, gg, bb], Math.max(0.04, opacity), 2.0), 1.0),
      );
      line.userData.tag = 'orb3d';
      line.userData.sh = sh;
      line.userData.oi = oi;
      line.userData.shellR = shellR;
      group.add(line);
    }
  }
  return group;
}

function updateOrbital3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Orbital Shell'];
  const [rr, gg, bb] = pal.rgb;
  const iF = Math.max(0.1, cfg.intensity / 10);
  const _shells = Math.max(1, Math.round(cfg.complexity));
  const orbs = Math.max(2, Math.round(cfg.symmetry));
  const ecc = (cfg.glow / 10) * 0.55;
  const STEPS = 120;
  const TAU = Math.PI * 2;
  const speed = cfg.breathSpeed * 0.00008;
  const breath = (Math.sin(t * 0.0007 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.88 + breath * 0.12;
  const twistK = cfg.particles * 0.18;

  for (const child of group.children) {
    if (child.userData.tag !== 'orb3d') continue;
    const sh = child.userData.sh as number;
    const oi = child.userData.oi as number;
    const shellR = (child.userData.shellR as number) * bs;
    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;

    const inc = (oi / orbs) * Math.PI;
    const az = (oi / orbs) * TAU * twistK + t * speed * (sh % 2 === 0 ? 1 : -0.6);
    const cosI = Math.cos(inc);
    const sinI = Math.sin(inc);
    const cosA = Math.cos(az);
    const sinA = Math.sin(az);
    const a = shellR;
    const b = shellR * (1 - ecc);

    for (let step = 0; step <= STEPS; step++) {
      const ang = (step / STEPS) * TAU;
      // Ellipse in local XY plane
      const lx = a * Math.cos(ang);
      const ly = b * Math.sin(ang);
      // Tilt around X axis by inclination
      const tx = lx;
      const ty = ly * cosI;
      const tz = ly * sinI;
      // Rotate around Z axis by azimuth
      pos[step * 3] = tx * cosA - ty * sinA;
      pos[step * 3 + 1] = tx * sinA + ty * cosA;
      pos[step * 3 + 2] = tz;
    }
    line.geometry.attributes.position.needsUpdate = true;
    updateMat(child as THREE.Object3D, [rr, gg, bb], (0.55 - sh * 0.06) * iF, 2.0);
  }
}

/* ── FIREWORK 3D mode ───────────────────────────────────────── */

const FW3D_PER_BURST = 48;
const FW3D_MAX_BURSTS = 8;
const FW3D_TOTAL = FW3D_MAX_BURSTS * FW3D_PER_BURST;

function buildFirework3D(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['DMT Vision'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const group = new THREE.Group();

  const px = new Float32Array(FW3D_TOTAL);
  const py = new Float32Array(FW3D_TOTAL);
  const pz = new Float32Array(FW3D_TOTAL);
  const vx = new Float32Array(FW3D_TOTAL);
  const vy = new Float32Array(FW3D_TOTAL);
  const vz = new Float32Array(FW3D_TOTAL);
  const age = new Float32Array(FW3D_TOTAL);
  const maxAge = new Float32Array(FW3D_TOTAL);
  const burstTimer = new Float32Array(FW3D_MAX_BURSTS);

  for (let b = 0; b < FW3D_MAX_BURSTS; b++) burstTimer[b] = b * 15 + Math.random() * 10;
  for (let i = 0; i < FW3D_TOTAL; i++) {
    age[i] = 99999;
    maxAge[i] = 1;
  }

  group.userData.fw3d = { px, py, pz, vx, vy, vz, age, maxAge, burstTimer };

  for (let i = 0; i < FW3D_TOTAL; i++) {
    const pts = new Float32Array(6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], iF, 2.5), 1.0));
    line.userData.tag = 'fw3dParticle';
    line.userData.idx = i;
    group.add(line);
  }
  return group;
}

function updateFirework3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const fw = group.userData.fw3d as {
    px: Float32Array;
    py: Float32Array;
    pz: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    vz: Float32Array;
    age: Float32Array;
    maxAge: Float32Array;
    burstTimer: Float32Array;
  };
  const nBursts = Math.min(FW3D_MAX_BURSTS, Math.max(1, Math.round(cfg.particles)));
  const speed = cfg.breathSpeed;
  const gravity = 0.035 * speed;
  const burstR = R * (0.3 + cfg.glow * 0.05);
  const baseColor = new THREE.Color();

  for (let b = 0; b < nBursts; b++) {
    fw.burstTimer[b] -= speed;
    if (fw.burstTimer[b] <= 0) {
      const angH = Math.random() * Math.PI * 2;
      const angV = (Math.random() - 0.5) * Math.PI * 0.8;
      const dist = (0.1 + Math.random() * 0.5) * burstR;
      const cx = Math.cos(angH) * Math.cos(angV) * dist;
      const cy = Math.sin(angV) * dist * 0.6;
      const cz = Math.sin(angH) * Math.cos(angV) * dist;
      const spd0 = burstR * (0.011 + Math.random() * 0.012) * speed;
      const nP = Math.round(cfg.symmetry);
      const TAU = Math.PI * 2;
      for (let p = 0; p < FW3D_PER_BURST; p++) {
        const i = b * FW3D_PER_BURST + p;
        if (p < nP) {
          const phi = Math.acos(1 - (2 * (p + 0.5)) / nP);
          const theta = TAU * p * 1.6180339887;
          const s = spd0 * (0.7 + Math.random() * 0.6);
          fw.px[i] = cx;
          fw.py[i] = cy;
          fw.pz[i] = cz;
          fw.vx[i] = Math.sin(phi) * Math.cos(theta) * s;
          fw.vy[i] = Math.cos(phi) * s;
          fw.vz[i] = Math.sin(phi) * Math.sin(theta) * s;
          fw.age[i] = 0;
          fw.maxAge[i] = 50 + Math.random() * 30;
        } else {
          fw.age[i] = 99999;
          fw.maxAge[i] = 1;
        }
      }
      fw.burstTimer[b] = (30 + Math.random() * 35) / speed;
    }
  }

  for (const child of group.children) {
    if (child.userData.tag !== 'fw3dParticle') continue;
    const idx = child.userData.idx as number;
    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;
    const b = Math.floor(idx / FW3D_PER_BURST);
    const alive = b < nBursts && fw.age[idx] < fw.maxAge[idx];

    if (!alive) {
      pos[1] = pos[4] = -9999;
      line.geometry.attributes.position.needsUpdate = true;
      (line.material as THREE.LineBasicMaterial).opacity = 0;
      continue;
    }

    fw.vy[idx] -= gravity;
    fw.px[idx] += fw.vx[idx];
    fw.py[idx] += fw.vy[idx];
    fw.pz[idx] += fw.vz[idx];
    fw.age[idx]++;

    const progress = fw.age[idx] / fw.maxAge[idx];
    const trailMult = 0.04 + (1 - progress) * 0.06;
    const spd = Math.sqrt(fw.vx[idx] ** 2 + fw.vy[idx] ** 2 + fw.vz[idx] ** 2) || 1;
    const trailLen = trailMult * R;
    const nx = (fw.vx[idx] / spd) * trailLen;
    const ny = (fw.vy[idx] / spd) * trailLen;
    const nz = (fw.vz[idx] / spd) * trailLen;

    pos[0] = fw.px[idx] - nx;
    pos[1] = fw.py[idx] - ny;
    pos[2] = fw.pz[idx] - nz;
    pos[3] = fw.px[idx];
    pos[4] = fw.py[idx];
    pos[5] = fw.pz[idx];
    line.geometry.attributes.position.needsUpdate = true;

    const hue = FW_HUES[b % FW_HUES.length];
    baseColor.setHSL(hue, 0.8, (0.55 + (1 - progress) * 0.3) * iF * 0.8);
    const mat = line.material as THREE.LineBasicMaterial;
    mat.color.copy(baseColor);
    mat.opacity = (1 - progress) ** 0.6 * 0.9;
  }
}

/* ── FIBONACCI 3D mode ──────────────────────────────────────── */

function buildFibonacci3D(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Fibonacci Bloom'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const N = Math.max(40, Math.round(cfg.complexity) * 30 + 60);
  const group = new THREE.Group();

  // Fibonacci sphere: N points on sphere using golden angle
  const dotPos = new Float32Array(N * 3);
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  const dots = new THREE.Points(
    dotGeo,
    circlePtsMat(hdrColor([rr, gg, bb], iF * 0.9, 2.0), 3.5, 0.8),
  );
  dots.userData.tag = 'fib3dDots';
  dots.userData.N = N;
  group.add(dots);

  // Spiral arms connecting golden-angle neighbours
  const armCount = Math.max(1, Math.round(cfg.particles));
  const STEPS = 300;
  for (let arm = 0; arm < armCount; arm++) {
    const pts = new Float32Array((STEPS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(
      geo,
      lineMat(hdrColor([rr, gg, bb], iF * (0.6 - arm * 0.06), 2.2), 1.0),
    );
    line.userData.tag = 'fib3dArm';
    line.userData.arm = arm;
    group.add(line);
  }
  return group;
}

function updateFibonacci3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Fibonacci Bloom'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const TAU = Math.PI * 2;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const spin = t * cfg.breathSpeed * 0.00008;
  const tilt = t * cfg.breathSpeed * 0.000032;
  const armCount = Math.max(1, Math.round(cfg.particles));
  const STEPS = 300;
  const rainbow = cfg.glow / 10;
  const timeHue = (t * 0.000045) % 1.0;
  const tmpColF = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;

    if (tag === 'fib3dDots') {
      const N = child.userData.N as number;
      const pts = child as THREE.Points;
      const pos = pts.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < N; i++) {
        const theta = Math.acos(1 - (2 * (i + 0.5)) / N);
        const phi = GOLDEN_ANGLE * i + spin;
        const r = R * (0.7 + Math.sin(tilt + i * 0.02) * 0.18);
        pos[i * 3] = r * Math.sin(theta) * Math.cos(phi);
        pos[i * 3 + 1] = r * Math.cos(theta);
        pos[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
      }
      pts.geometry.attributes.position.needsUpdate = true;
      tmpColF.setHSL(timeHue, 1.0, 0.55);
      const dotCol: [number, number, number] = [
        lerp(rr, tmpColF.r * 255, rainbow),
        lerp(gg, tmpColF.g * 255, rainbow),
        lerp(bb, tmpColF.b * 255, rainbow),
      ];
      updateMat(pts, dotCol, iF * 0.9, 2.0);
    } else if (tag === 'fib3dArm') {
      const arm = child.userData.arm as number;
      if (arm >= armCount) {
        (child as THREE.Line).geometry.setDrawRange(0, 0);
        continue;
      }
      const line = child as THREE.Line;
      const pos = line.geometry.attributes.position.array as Float32Array;
      const armPhase = (arm / armCount) * TAU;
      for (let step = 0; step <= STEPS; step++) {
        const frac = step / STEPS;
        const theta = Math.acos(1 - 2 * frac);
        const phi = GOLDEN_ANGLE * step * (arm + 1) * 0.5 + spin + armPhase;
        const r = R * (0.65 + Math.sin(tilt + frac * Math.PI) * 0.22);
        pos[step * 3] = r * Math.sin(theta) * Math.cos(phi);
        pos[step * 3 + 1] = r * Math.cos(theta);
        pos[step * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
      }
      line.geometry.attributes.position.needsUpdate = true;
      line.geometry.setDrawRange(0, STEPS + 1);
      const armHue = ((arm / Math.max(1, armCount)) * 0.7 + timeHue) % 1.0;
      tmpColF.setHSL(armHue, 1.0, 0.55);
      const armCol: [number, number, number] = [
        lerp(rr, tmpColF.r * 255, rainbow),
        lerp(gg, tmpColF.g * 255, rainbow),
        lerp(bb, tmpColF.b * 255, rainbow),
      ];
      updateMat(line, armCol, iF * (0.6 - arm * 0.06), 2.2);
    }
  }
}

/* ── YANTRA 3D mode ─────────────────────────────────────────── */

function buildYantra3D(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Yantra Fire'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.max(1, Math.round(cfg.symmetry));
  const layers = Math.max(1, Math.round(cfg.complexity));
  const group = new THREE.Group();

  // Layered rotating triangles/stars on different planes in 3D
  for (let la = 0; la < layers; la++) {
    for (let s = 0; s < sym; s++) {
      const pts = new Float32Array((s + 3 + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const opacity = (0.7 - la * 0.1) * iF;
      const line = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], opacity, 2.5), 1.0));
      line.userData.tag = 'yantra3dLine';
      line.userData.la = la;
      line.userData.s = s;
      line.userData.nVerts = s + 3;
      group.add(line);
    }
  }
  return group;
}

function updateYantra3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Yantra Fire'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const TAU = Math.PI * 2;
  const layers = Math.max(1, Math.round(cfg.complexity));
  const sym = Math.max(1, Math.round(cfg.symmetry));
  const speed = cfg.breathSpeed * 0.00008;
  const glow = cfg.glow;
  const rainbow = glow / 10;
  const timeHue = (t * 0.000055) % 1.0;
  const tmpColR = new THREE.Color();

  for (const child of group.children) {
    if (child.userData.tag !== 'yantra3dLine') continue;
    const la = child.userData.la as number;
    const s = child.userData.s as number;
    const nVerts = child.userData.nVerts as number;
    if (la >= layers || s >= sym) {
      (child as THREE.Line).geometry.setDrawRange(0, 0);
      continue;
    }

    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;

    // Each shape lives in a DIFFERENT 3D plane for genuine 3D appearance
    // Axis of rotation alternates: X, Y, Z, diagonal...
    const planeAxis = (la * 2 + s) % 3; // 0=XY, 1=XZ, 2=YZ
    const planeAngle = la * (Math.PI / (layers + 1)) + s * (Math.PI / (sym + 1));
    const rotSpeed = speed * (1 + s * 0.25) * (la % 2 === 0 ? 1 : -1);
    const ang = t * rotSpeed + la * 0.6;

    const layerFrac = la / Math.max(1, layers - 1);
    // Pyramid shape: large at bottom, tapering to top
    const r = R * (0.8 - layerFrac * 0.55);
    const zHeight = R * (layerFrac * 1.1 - 0.55) * (0.5 + glow * 0.05);

    for (let v = 0; v <= nVerts; v++) {
      const a = (v / nVerts) * TAU + ang;
      const cr = Math.cos(a) * r;
      const sr = Math.sin(a) * r;
      const cp = Math.cos(planeAngle);
      const sp = Math.sin(planeAngle);
      if (planeAxis === 0) {
        // XY plane, tilted by planeAngle around X
        pos[v * 3] = cr;
        pos[v * 3 + 1] = sr * cp + zHeight * sp;
        pos[v * 3 + 2] = -sr * sp + zHeight * cp;
      } else if (planeAxis === 1) {
        // XZ plane, tilted by planeAngle around Y
        pos[v * 3] = cr * cp + zHeight * sp;
        pos[v * 3 + 1] = zHeight * 0.5 + sr;
        pos[v * 3 + 2] = -cr * sp + zHeight * cp;
      } else {
        // YZ plane, tilted by planeAngle around Z
        pos[v * 3] = zHeight * cp - sr * sp;
        pos[v * 3 + 1] = zHeight * sp + sr * cp;
        pos[v * 3 + 2] = cr;
      }
    }
    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.setDrawRange(0, nVerts + 1);
    const opacity = (0.65 - la * 0.05) * iF;
    const layerHue = (la / Math.max(1, layers) + (s / Math.max(1, sym)) * 0.5 + timeHue) % 1.0;
    tmpColR.setHSL(layerHue, 1.0, 0.55);
    const colY: [number, number, number] = [
      lerp(rr, tmpColR.r * 255, rainbow),
      lerp(gg, tmpColR.g * 255, rainbow),
      lerp(bb, tmpColR.b * 255, rainbow),
    ];
    updateMat(line, colY, opacity, 2.5);
  }
}

/* ── RAINBOW 3D mode — sphere of great circles ──────────────── */

const RB3D_MAX_CIRCLES = 36;
const RB3D_STEPS = 120;

function buildRainbow3D(cfg: Cfg, R: number): THREE.Group {
  const iF = cfg.intensity / 10;
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  for (let i = 0; i < RB3D_MAX_CIRCLES; i++) {
    const pts = new Float32Array((RB3D_STEPS + 1) * 3);
    const colorArr = new Float32Array((RB3D_STEPS + 1) * 3);
    const hue = i / RB3D_MAX_CIRCLES;
    tmpCol.setHSL(hue, 1.0, 0.55 * iF);
    for (let step = 0; step <= RB3D_STEPS; step++) {
      colorArr[step * 3] = tmpCol.r;
      colorArr[step * 3 + 1] = tmpCol.g;
      colorArr[step * 3 + 2] = tmpCol.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
    });
    const line = new THREE.Line(geo, mat);
    line.userData.tag = 'rb3d';
    line.userData.idx = i;
    group.add(line);
  }
  return group;
}

function updateRainbow3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const meridians = Math.max(1, Math.round(cfg.symmetry));
  const latitudes = Math.max(0, Math.round(cfg.complexity));
  const TAU = Math.PI * 2;
  const speed = cfg.breathSpeed * 0.00008;
  const glow = cfg.glow;
  const tmpCol = new THREE.Color();
  const totalActive = Math.min(RB3D_MAX_CIRCLES, meridians + latitudes);

  for (const child of group.children) {
    if (child.userData.tag !== 'rb3d') continue;
    const idx = child.userData.idx as number;
    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;
    const colorArr = line.geometry.attributes.color.array as Float32Array;

    if (idx >= totalActive) {
      line.geometry.setDrawRange(0, 0);
      continue;
    }

    const hue = (idx / totalActive + t * 0.00002) % 1.0;
    const ripple = 1 + Math.sin(t * speed * glow + idx * 0.5) * 0.06;

    if (idx < meridians) {
      // Great circles (meridians) — pass through poles
      const az = (idx / meridians) * Math.PI + t * speed * 0.5;
      const cosAz = Math.cos(az),
        sinAz = Math.sin(az);
      for (let step = 0; step <= RB3D_STEPS; step++) {
        const a = (step / RB3D_STEPS) * TAU;
        const r = R * ripple;
        const lx = Math.cos(a) * r;
        const lz = Math.sin(a) * r;
        pos[step * 3] = lx * cosAz;
        pos[step * 3 + 1] = lz;
        pos[step * 3 + 2] = lx * sinAz;
      }
    } else {
      // Latitude rings (parallels)
      const latIdx = idx - meridians;
      const latFrac = (latIdx + 1) / (latitudes + 1);
      const latAngle = latFrac * Math.PI - Math.PI / 2;
      const ringR = R * Math.cos(latAngle) * ripple;
      const y = R * Math.sin(latAngle) * ripple;
      const phaseShift = t * speed * (latIdx % 2 === 0 ? 1 : -1);
      for (let step = 0; step <= RB3D_STEPS; step++) {
        const a = (step / RB3D_STEPS) * TAU + phaseShift;
        pos[step * 3] = Math.cos(a) * ringR;
        pos[step * 3 + 1] = y;
        pos[step * 3 + 2] = Math.sin(a) * ringR;
      }
    }
    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.setDrawRange(0, RB3D_STEPS + 1);

    tmpCol.setHSL(hue, 1.0, 0.55 * iF);
    for (let step = 0; step <= RB3D_STEPS; step++) {
      colorArr[step * 3] = tmpCol.r;
      colorArr[step * 3 + 1] = tmpCol.g;
      colorArr[step * 3 + 2] = tmpCol.b;
    }
    line.geometry.attributes.color.needsUpdate = true;
    (line.material as THREE.LineBasicMaterial).opacity = 0.72;
  }
}

/* ── GOLDEN mode ────────────────────────────────────────────── */

function buildGolden(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const layers = Math.max(1, Math.round(cfg.complexity));
  const PHI = 1.6180339887;
  const scale = R / 210;

  const group = new THREE.Group();
  const pointCount = Math.round(100 + layers * 80);

  // Phyllotaxis dots (positions updated each frame)
  const dotPos = new Float32Array(pointCount * 3);
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  const dots = new THREE.Points(dotGeo, ptsMat(hdrColor([rr, gg, bb], iF, 1.5), 2 * scale, 0.8));
  dots.userData.tag = 'phyllo';
  dots.userData.pointCount = pointCount;
  group.add(dots);

  // Spiral arms (positions updated each frame)
  const armCount = Math.min(Math.round(layers / 2) + 2, 8);
  const STEPS = 200;
  for (let arm = 0; arm < armCount; arm++) {
    const armPos = new Float32Array((STEPS + 1) * 3);
    const armGeo = new THREE.BufferGeometry();
    armGeo.setAttribute('position', new THREE.BufferAttribute(armPos, 3));
    const spiral = new THREE.Line(armGeo, lineMat(hdrColor([rr, gg, bb], iF * 0.5, 1.8), 1.0));
    spiral.userData.tag = 'spiral';
    spiral.userData.arm = arm;
    spiral.userData.armCount = armCount;
    group.add(spiral);
  }

  // Golden-ratio concentric rings (static positions, scale changes with breath)
  const ringGroup = new THREE.Group();
  ringGroup.userData.tag = 'goldenRings';
  let ringR = 0.1;
  while (ringR < 1.05) {
    const ring = new THREE.Line(circleGeo(80), lineMat(hdrColor([rr, gg, bb], iF * 0.15, 2), 1.0));
    ring.scale.setScalar(R * ringR);
    ring.userData.baseScale = R * ringR;
    ringGroup.add(ring);
    ringR *= PHI;
  }
  group.add(ringGroup);

  const center = buildCenter([rr, gg, bb], iF, scale);
  center.userData.tag = 'center';
  group.add(center);
  return group;
}

function updateGolden(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.9 + breath * 0.1;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const PHI = 1.6180339887;
  const TAU = Math.PI * 2;
  const STEPS = 200;
  const tOff = t * 0.00015;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'phyllo') {
      const pts = child as THREE.Points;
      const pos = pts.geometry.attributes.position.array as Float32Array;
      const N = pts.userData.pointCount as number;
      for (let i = 0; i < N; i++) {
        const r = Math.sqrt(i / N) * R * bs;
        const a = i * GOLDEN_ANGLE + tOff;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
      }
      pts.geometry.attributes.position.needsUpdate = true;
      updateMat(pts, [rr, gg, bb], iF, 1.5);
    } else if (tag === 'spiral') {
      const sp = child as THREE.Line;
      const arm = sp.userData.arm as number;
      const armCount = sp.userData.armCount as number;
      const pos = sp.geometry.attributes.position.array as Float32Array;
      const armOff = (arm / armCount) * TAU + tOff * 0.5;
      for (let step = 0; step <= STEPS; step++) {
        const f = step / STEPS;
        const theta = f * TAU * Math.log(PHI) * 8 + armOff;
        const r = f * R * bs;
        pos[step * 3] = Math.cos(theta) * r;
        pos[step * 3 + 1] = Math.sin(theta) * r;
      }
      sp.geometry.attributes.position.needsUpdate = true;
      updateMat(sp, [rr, gg, bb], iF * 0.5, 1.8);
    } else if (tag === 'goldenRings') {
      (child as THREE.Group).children.forEach((ring) => {
        ring.scale.setScalar((ring.userData.baseScale as number) * bs);
        updateMat(ring as THREE.Object3D, [rr, gg, bb], iF * 0.15, 2);
      });
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF, scale);
    }
  }
}

/* ── KALEIDOSCOPE mode — infinite outward zoom tunnel ───────── */

const K_SLICES = 40;
const K_MAX_VERTS = 49;
const K_MAX_SPOKES = 24;

function buildKaleidoscope(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Violet Portal'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const group = new THREE.Group();

  for (let i = 0; i < K_SLICES; i++) {
    const pts = new Float32Array(K_MAX_VERTS * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    geo.setDrawRange(0, 0);
    const line = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], 0.5 * iF, 2.5), 1.0));
    line.userData.tag = 'kring';
    line.userData.idx = i;
    group.add(line);
  }

  for (let s = 0; s < K_MAX_SPOKES; s++) {
    const pts = new Float32Array(6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], 0.15 * iF, 2.0), 1.0));
    line.userData.tag = 'kspoke';
    line.userData.sIdx = s;
    group.add(line);
  }

  return group;
}

function updateKaleidoscope(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Violet Portal'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.min(K_MAX_VERTS - 1, Math.max(3, Math.round(cfg.symmetry)));
  const TAU = Math.PI * 2;
  const speed = cfg.breathSpeed * 0.0001;
  const R_max = R * 2.8;
  const rotRate = cfg.glow * 0.000025;
  const activeSpokes = Math.max(0, Math.round(cfg.complexity));

  for (const child of group.children) {
    const tag = child.userData.tag as string;

    if (tag === 'kring') {
      const idx = child.userData.idx as number;
      const line = child as THREE.Line;
      const pos = line.geometry.attributes.position.array as Float32Array;

      const rawPhase = (idx / K_SLICES + t * speed) % 1.0;
      const frac = rawPhase ** 0.55;
      const r = R_max * frac;

      const sign = idx % 2 === 0 ? 1 : -1;
      const ang = t * rotRate * sign;

      for (let v = 0; v <= sym; v++) {
        const a = (v / sym) * TAU + ang;
        pos[v * 3] = Math.cos(a) * r;
        pos[v * 3 + 1] = Math.sin(a) * r;
        pos[v * 3 + 2] = 0;
      }
      line.geometry.attributes.position.needsUpdate = true;
      line.geometry.setDrawRange(0, sym + 1);

      const opacity = Math.min(1, frac * 1.8) * iF * 0.7;
      updateMat(line, [rr, gg, bb], opacity, 2.5);
    } else if (tag === 'kspoke') {
      const sIdx = child.userData.sIdx as number;
      const line = child as THREE.Line;
      const pos = line.geometry.attributes.position.array as Float32Array;

      if (sIdx >= activeSpokes || activeSpokes === 0) {
        pos[1] = pos[4] = -9999;
        line.geometry.attributes.position.needsUpdate = true;
        (line.material as THREE.LineBasicMaterial).opacity = 0;
        continue;
      }

      const spokeAngle = (sIdx / activeSpokes) * TAU + t * rotRate;
      pos[0] = 0;
      pos[1] = 0;
      pos[2] = 0;
      pos[3] = Math.cos(spokeAngle) * R_max;
      pos[4] = Math.sin(spokeAngle) * R_max;
      pos[5] = 0;
      line.geometry.attributes.position.needsUpdate = true;
      updateMat(line, [rr, gg, bb], 0.12 * iF, 2.0);
    }
  }
}

/* ── TORUS mode ─────────────────────────────────────────────── */

function buildTorus(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Cosmic Indigo'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.round(cfg.symmetry);
  const layers = Math.max(1, Math.round(cfg.complexity));
  const TAU = Math.PI * 2;
  const scale = R / 210;
  const p = 2;
  const q = Math.round(3 + layers * 0.4);
  const KSTEPS = 600;
  const LSTEPS = 300;

  const group = new THREE.Group();

  // Main torus knot
  const knotPos = new Float32Array((KSTEPS + 1) * 3);
  const knotGeo = new THREE.BufferGeometry();
  knotGeo.setAttribute('position', new THREE.BufferAttribute(knotPos, 3));
  const knot = new THREE.Line(knotGeo, lineMat(hdrColor([rr, gg, bb], iF, 2.2), 1.0));
  knot.userData.tag = 'knot';
  knot.userData.p = p;
  knot.userData.q = q;
  knot.userData.steps = KSTEPS;
  knot.userData.r1 = R * 0.5;
  knot.userData.r2 = R * 0.25;
  group.add(knot);

  // Multi-phase torus layers
  for (let layer = 1; layer <= layers + 1; layer++) {
    const lPos = new Float32Array((LSTEPS + 1) * 3);
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
    const lLine = new THREE.Line(
      lGeo,
      lineMat(hdrColor([rr, gg, bb], iF * (0.15 + layer * 0.05), 2), 1.0),
    );
    lLine.userData.tag = 'torusLayer';
    lLine.userData.layer = layer;
    lLine.userData.layers = layers;
    lLine.userData.p = p;
    lLine.userData.q = q;
    lLine.userData.steps = LSTEPS;
    group.add(lLine);
  }

  // Orbital rings with dots
  for (let i = 1; i <= Math.round(4 + layers); i++) {
    const orbitR = R * (i / (4 + layers));
    const ring = new THREE.Line(circleGeo(80), lineMat(hdrColor([rr, gg, bb], iF * 0.2, 1.5), 1.0));
    ring.scale.setScalar(orbitR);
    ring.userData.tag = 'orbitRing';
    ring.userData.orbitR = orbitR;
    ring.userData.dir = i % 2 === 0 ? 1 : -1;
    group.add(ring);

    const dotPos = new Float32Array(sym * 3);
    for (let d = 0; d < sym; d++) {
      const a = (d / sym) * TAU;
      dotPos[d * 3] = Math.cos(a) * orbitR;
      dotPos[d * 3 + 1] = Math.sin(a) * orbitR;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
    const orbitDots = new THREE.Points(dGeo, ptsMat(hdrColor([rr, gg, bb], iF, 2), 2 * scale, 0.7));
    orbitDots.userData.tag = 'orbitDots';
    orbitDots.userData.orbitR = orbitR;
    orbitDots.userData.dir = i % 2 === 0 ? 1 : -1;
    group.add(orbitDots);
  }

  const center = buildCenter([rr, gg, bb], iF, scale);
  center.userData.tag = 'center';
  group.add(center);
  return group;
}

function updateTorus(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Cosmic Indigo'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.9 + breath * 0.1;
  const TAU = Math.PI * 2;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'knot') {
      const k = child as THREE.Line;
      const pos = k.geometry.attributes.position.array as Float32Array;
      const p2 = k.userData.p as number;
      const q2 = k.userData.q as number;
      const steps = k.userData.steps as number;
      const r1 = (k.userData.r1 as number) * bs;
      const r2 = (k.userData.r2 as number) * bs;
      for (let i = 0; i <= steps; i++) {
        const tp = (i / steps) * TAU + t * 0.0001;
        const r = r2 * Math.cos(q2 * tp) + r1;
        pos[i * 3] = r * Math.cos(p2 * tp);
        pos[i * 3 + 1] = r * Math.sin(p2 * tp);
      }
      k.geometry.attributes.position.needsUpdate = true;
      updateMat(k, [rr, gg, bb], iF, 2.2);
    } else if (tag === 'torusLayer') {
      const l = child as THREE.Line;
      const pos = l.geometry.attributes.position.array as Float32Array;
      const p2 = l.userData.p as number;
      const q2 = l.userData.q as number;
      const steps = l.userData.steps as number;
      const layer = l.userData.layer as number;
      const layers = l.userData.layers as number;
      const r1 = R * bs * (layer / (layers + 2)) * 0.9;
      const r2 = r1 * 0.35;
      const tOff = t * 0.0001 * (layer % 2 === 0 ? 1 : -0.8) + (layer / layers) * Math.PI;
      for (let i = 0; i <= steps; i++) {
        const tp = (i / steps) * TAU + tOff;
        const r = r2 * Math.cos(q2 * tp) + r1;
        pos[i * 3] = r * Math.cos(p2 * tp);
        pos[i * 3 + 1] = r * Math.sin(p2 * tp);
      }
      l.geometry.attributes.position.needsUpdate = true;
      updateMat(l, [rr, gg, bb], (0.15 + layer * 0.05) * iF, 2);
    } else if (tag === 'orbitRing') {
      child.rotation.z = t * 0.00018 * (child.userData.dir as number);
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF * 0.2, 1.5);
    } else if (tag === 'orbitDots') {
      child.rotation.z = t * 0.00025 * (child.userData.dir as number);
      const mat = (child as THREE.Points).material as THREE.PointsMaterial;
      mat.opacity = (0.3 + breath * 0.3) * iF;
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF, 2);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF, scale);
    }
  }
}

/* ── TUNNEL mode ────────────────────────────────────────────── */

function buildTunnel(cfg: Cfg, _R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Warp Tunnel'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.round(cfg.symmetry);
  const layers = Math.max(1, Math.round(cfg.complexity));
  const ringCount = 6 + layers * 3;
  const CIRC = 48;
  const vertsPerRing = CIRC * 2 + sym * 2;
  const group = new THREE.Group();

  for (let i = 0; i < ringCount; i++) {
    const t0 = i / ringCount;
    const pos = new Float32Array(vertsPerRing * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ring = new THREE.LineSegments(
      geo,
      lineMat(hdrColor([rr, gg, bb], iF * (0.2 + t0 * 0.8), 2.5), 1.0),
    );
    ring.userData.tag = 'tunnelRing';
    ring.userData.t = t0;
    ring.userData.rollOff = (i % 2 === 0 ? 1 : -1) * (i * 0.04);
    group.add(ring);
  }

  const center = buildCenter([rr, gg, bb], iF * 1.5, _R / 210);
  center.userData.tag = 'center';
  group.add(center);
  return group;
}

function updateTunnel(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Warp Tunnel'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const sym = Math.round(cfg.symmetry);
  const CIRC = 48;
  const TAU = Math.PI * 2;
  const speed = cfg.breathSpeed * 0.00055;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'tunnelRing') {
      const ring = child as THREE.LineSegments;
      ring.userData.t = ((ring.userData.t as number) + speed) % 1;
      const tVal = ring.userData.t as number;
      const rollOff = ring.userData.rollOff as number;

      // Perspective projection: tiny at vanishing point, large as it flies past viewer
      const screenR = R * 1.85 * tVal ** 1.5;
      const brightness = tVal ** 0.55 * iF * 2.4;
      const opacity = Math.min(1, tVal * 4) * 0.9;

      const pos = ring.geometry.attributes.position.array as Float32Array;

      // Circle: pairs (p_i → p_{i+1})
      for (let seg = 0; seg < CIRC; seg++) {
        const a0 = (seg / CIRC) * TAU + rollOff;
        const a1 = ((seg + 1) / CIRC) * TAU + rollOff;
        const base = seg * 6;
        pos[base] = Math.cos(a0) * screenR;
        pos[base + 1] = Math.sin(a0) * screenR;
        pos[base + 2] = 0;
        pos[base + 3] = Math.cos(a1) * screenR;
        pos[base + 4] = Math.sin(a1) * screenR;
        pos[base + 5] = 0;
      }

      // Spokes: centre → rim
      const spokeBase = CIRC * 6;
      for (let s = 0; s < sym; s++) {
        const a = (s / sym) * TAU + rollOff;
        const si = spokeBase + s * 6;
        pos[si] = 0;
        pos[si + 1] = 0;
        pos[si + 2] = 0;
        pos[si + 3] = Math.cos(a) * screenR;
        pos[si + 4] = Math.sin(a) * screenR;
        pos[si + 5] = 0;
      }

      ring.geometry.attributes.position.needsUpdate = true;
      const mat = ring.material as THREE.LineBasicMaterial;
      mat.opacity = opacity;
      mat.color.setRGB((rr / 255) * brightness, (gg / 255) * brightness, (bb / 255) * brightness);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF * 1.5, scale);
    }
  }
}

/* ── VITRAL (stained glass) mode ────────────────────────────── */

function buildVitral(cfg: Cfg, _R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Sacred Vitral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.round(cfg.symmetry);
  const layers = Math.min(Math.max(1, Math.round(cfg.complexity)), 8);
  const TAU = Math.PI * 2;
  const ARC = 10;
  const group = new THREE.Group();

  // Normalised ring radii (group scaled to R each frame in update)
  const ringRadii: number[] = [];
  for (let i = 0; i <= layers; i++) ringRadii.push(0.04 + (i / layers) * 0.93);

  // Coloured cell meshes
  for (let sector = 0; sector < sym; sector++) {
    const a1 = (sector / sym) * TAU;
    const a2 = ((sector + 1) / sym) * TAU;
    for (let layer = 0; layer < ringRadii.length - 1; layer++) {
      const innerR = ringRadii[layer];
      const outerR = ringRadii[layer + 1];
      const shape = new THREE.Shape();
      shape.moveTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
      shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
      for (let k = 1; k <= ARC; k++) {
        const a = a1 + (k / ARC) * (a2 - a1);
        shape.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
      }
      shape.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
      for (let k = ARC - 1; k >= 0; k--) {
        const a = a1 + (k / ARC) * (a2 - a1);
        shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
      }
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      const hue = (sector / sym + (layer / layers) * 0.12) % 1.0;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 0.9, 0.5),
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.tag = 'cell';
      mesh.userData.sector = sector;
      mesh.userData.layer = layer;
      group.add(mesh);
    }
  }

  // Lead lines — rings
  for (const normR of ringRadii) {
    const ring = new THREE.Line(circleGeo(96), lineMat(hdrColor([rr, gg, bb], iF * 0.35, 2), 1.0));
    ring.scale.setScalar(normR);
    ring.userData.tag = 'vitralRing';
    group.add(ring);
  }

  // Lead lines — radials
  const radPos = new Float32Array(sym * 6);
  for (let s = 0; s < sym; s++) {
    const a = (s / sym) * TAU;
    radPos[s * 6] = Math.cos(a) * ringRadii[0];
    radPos[s * 6 + 1] = Math.sin(a) * ringRadii[0];
    radPos[s * 6 + 3] = Math.cos(a) * ringRadii[ringRadii.length - 1];
    radPos[s * 6 + 4] = Math.sin(a) * ringRadii[ringRadii.length - 1];
  }
  const radGeo = new THREE.BufferGeometry();
  radGeo.setAttribute('position', new THREE.BufferAttribute(radPos, 3));
  group.add(
    Object.assign(
      new THREE.LineSegments(radGeo, lineMat(hdrColor([rr, gg, bb], iF * 0.4, 2), 1.0)),
      {
        userData: { tag: 'vitralRad' },
      },
    ),
  );

  void _R;
  return group;
}

function updateVitral(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Sacred Vitral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.round(cfg.symmetry);
  const layers = Math.min(Math.max(1, Math.round(cfg.complexity)), 8);
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const tDrift = t * 0.000032;

  group.scale.setScalar(R);
  group.rotation.z = t * 0.000028;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'cell') {
      const mesh = child as THREE.Mesh;
      const sector = mesh.userData.sector as number;
      const layer = mesh.userData.layer as number;
      const hue = (sector / sym + (layer / layers) * 0.14 + tDrift) % 1.0;
      const wave = Math.sin(t * 0.001 * cfg.breathSpeed + sector * 0.62 + layer * 1.05) * 0.5 + 0.5;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.setHSL(hue, 0.92, 0.52);
      mat.opacity = (0.06 + wave * 0.2) * iF;
    } else if (tag === 'vitralRing' || tag === 'vitralRad') {
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF * (0.3 + breath * 0.25), 2);
    }
  }
}

/* ── FIBONACCI mode ─────────────────────────────────────────── */

function buildFibonacci(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Fibonacci Bloom'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.round(cfg.symmetry);
  const layers = Math.max(1, Math.round(cfg.complexity));
  const PHI = 1.6180339887;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const STEPS = 420;
  const scale = R / 210;
  const group = new THREE.Group();

  // One logarithmic spiral arm per symmetry copy (positions updated each frame)
  for (let s = 0; s < sym; s++) {
    const pts = new Float32Array((STEPS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const sp = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], iF * 0.7, 2.2), 1.0));
    sp.userData.tag = 'fibSpiral';
    sp.userData.armIdx = s;
    group.add(sp);
  }

  // Fibonacci rings at normalised radii — static scale, updated each frame
  const fibSeq: number[] = [1, 1];
  while (fibSeq[fibSeq.length - 1] < 300) {
    const n = fibSeq.length;
    fibSeq.push(fibSeq[n - 1] + fibSeq[n - 2]);
  }
  const ringCount = Math.min(4 + layers * 2, fibSeq.length - 1);
  const maxFib = fibSeq[ringCount];

  for (let i = 2; i <= ringCount; i++) {
    const normR = (fibSeq[i] / maxFib) * R;
    const ring = new THREE.Line(
      circleGeo(80),
      lineMat(hdrColor([rr, gg, bb], iF * (0.08 + (i / ringCount) * 0.22), 1.8), 1.0),
    );
    ring.scale.setScalar(normR);
    ring.userData.tag = 'fibRing';
    ring.userData.normR = normR;
    ring.userData.ringIdx = i;
    group.add(ring);

    // Golden-angle dots on this ring (count = the Fibonacci number itself, capped)
    const dotCount = Math.min(fibSeq[i], 55);
    const dotPos = new Float32Array(dotCount * 3);
    for (let d = 0; d < dotCount; d++) {
      const a = d * GOLDEN_ANGLE;
      dotPos[d * 3] = Math.cos(a) * normR;
      dotPos[d * 3 + 1] = Math.sin(a) * normR;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
    const dots = new THREE.Points(
      dGeo,
      ptsMat(hdrColor([rr, gg, bb], iF * 1.3, 2.2), 2.2 * scale, 0.7),
    );
    dots.userData.tag = 'fibDots';
    dots.userData.normR = normR;
    group.add(dots);
  }

  // Extra: connecting radials along golden angle — shows the hidden spiral arms
  const armCount = Math.min(Math.round(layers * 1.5 + 3), 13);
  const armPos = new Float32Array(armCount * 6);
  for (let i = 0; i < armCount; i++) {
    const a = i * GOLDEN_ANGLE * PHI;
    armPos[i * 6] = 0;
    armPos[i * 6 + 1] = 0;
    armPos[i * 6 + 3] = Math.cos(a) * R;
    armPos[i * 6 + 4] = Math.sin(a) * R;
  }
  const armGeo = new THREE.BufferGeometry();
  armGeo.setAttribute('position', new THREE.BufferAttribute(armPos, 3));
  const armLines = new THREE.LineSegments(
    armGeo,
    lineMat(hdrColor([rr, gg, bb], iF * 0.12, 1.8), 1.0),
  );
  armLines.userData.tag = 'fibArms';
  group.add(armLines);

  const center = buildCenter([rr, gg, bb], iF, scale);
  center.userData.tag = 'center';
  group.add(center);
  return group;
}

function updateFibonacci(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Fibonacci Bloom'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const PHI = 1.6180339887;
  const b = (2 / Math.PI) * Math.log(PHI); // logarithmic growth rate
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const bs = 0.9 + breath * 0.1;
  const sym = Math.round(cfg.symmetry);
  const layers = Math.max(1, Math.round(cfg.complexity));
  const turns = 2.5 + layers * 0.4;
  const STEPS = 420;
  const TAU = Math.PI * 2;
  const maxTheta = turns * TAU;
  const tOff = t * 0.00008;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'fibSpiral') {
      const sp = child as THREE.Line;
      const armIdx = sp.userData.armIdx as number;
      const pos = sp.geometry.attributes.position.array as Float32Array;
      const rotOff = (armIdx / sym) * TAU + tOff;
      for (let i = 0; i <= STEPS; i++) {
        const theta = (i / STEPS) * maxTheta;
        // r(θ) = R at θ=maxTheta, tiny at θ=0 — pure logarithmic spiral
        const r = R * bs * Math.exp(b * (theta - maxTheta));
        pos[i * 3] = Math.cos(theta + rotOff) * r;
        pos[i * 3 + 1] = Math.sin(theta + rotOff) * r;
        pos[i * 3 + 2] = 0;
      }
      sp.geometry.attributes.position.needsUpdate = true;
      updateMat(sp, [rr, gg, bb], iF * 0.7, 2.2);
    } else if (tag === 'fibRing') {
      const ring = child as THREE.Line;
      ring.scale.setScalar((ring.userData.normR as number) * bs);
      const ri = ring.userData.ringIdx as number;
      updateMat(ring, [rr, gg, bb], iF * (0.08 + (ri / 10) * 0.22), 1.8);
    } else if (tag === 'fibDots') {
      const dots = child as THREE.Points;
      dots.scale.setScalar(bs);
      dots.rotation.z = tOff * 0.4;
      const mat = dots.material as THREE.PointsMaterial;
      mat.opacity = (0.4 + breath * 0.4) * iF;
      mat.size = (1.6 + breath * 1.4) * scale;
      updateMat(dots, [rr, gg, bb], iF * 1.3, 2.2);
    } else if (tag === 'fibArms') {
      child.rotation.z = tOff * 0.6;
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF * 0.12, 1.8);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF, scale);
    }
  }
}

/* ── CLIFFORD ATTRACTOR mode ────────────────────────────────── */

// Known beautiful (a, b, c, d) parameter sets
const CLIFFORD_SETS: [number, number, number, number][] = [
  [-1.4, 1.6, 1.0, 0.7],
  [-1.7, 1.3, -0.1, -1.21],
  [-2.0, 1.0, -0.1, -1.0],
  [-1.7, 1.8, -1.9, -0.4],
  [-1.5, -1.8, 1.6, 0.9],
  [-1.9, -1.3, -1.8, -1.4],
  [1.7, 1.7, 0.6, 1.2],
];

function buildClifford(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Clifford Dream'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const N = 18000;
  const group = new THREE.Group();

  const pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, ptsMat(hdrColor([rr, gg, bb], iF, 1.6), 1.1 * scale, 0.6));
  pts.userData.tag = 'attractor';
  pts.userData.N = N;
  pts.userData.x = 0.1;
  pts.userData.y = 0.1;
  pts.userData.writeIdx = 0;
  group.add(pts);

  const center = buildCenter([rr, gg, bb], iF * 1.2, scale);
  center.userData.tag = 'center';
  group.add(center);
  return group;
}

function updateClifford(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Clifford Dream'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const layers = Math.max(1, Math.round(cfg.complexity));

  // Drift slowly between parameter sets
  const drift = t * 0.000018 * cfg.breathSpeed;
  const setIdx = Math.floor(drift) % CLIFFORD_SETS.length;
  const frac = drift - Math.floor(drift);
  const [a1, b1, c1, d1] = CLIFFORD_SETS[setIdx];
  const [a2, b2, c2, d2] = CLIFFORD_SETS[(setIdx + 1) % CLIFFORD_SETS.length];
  const lp = (x: number, y: number, f: number) => x + (y - x) * f;
  const a = lp(a1, a2, frac);
  const b = lp(b1, b2, frac);
  const c = lp(c1, c2, frac);
  const d = lp(d1, d2, frac);

  // Scale: Clifford outputs roughly in [-2.5, 2.5]
  const sc = R * 0.38 * (0.92 + breath * 0.08);

  const ptsPerFrame = 80 + layers * 60;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'attractor') {
      const pts = child as THREE.Points;
      const N = pts.userData.N as number;
      const pos = pts.geometry.attributes.position.array as Float32Array;
      let x = pts.userData.x as number;
      let y = pts.userData.y as number;
      let wi = pts.userData.writeIdx as number;

      for (let i = 0; i < ptsPerFrame; i++) {
        const nx = Math.sin(a * y) + c * Math.cos(a * x);
        const ny = Math.sin(b * x) + d * Math.cos(b * y);
        x = nx;
        y = ny;
        pos[wi * 3] = x * sc;
        pos[wi * 3 + 1] = y * sc;
        pos[wi * 3 + 2] = 0;
        wi = (wi + 1) % N;
      }

      pts.userData.x = x;
      pts.userData.y = y;
      pts.userData.writeIdx = wi;
      pts.geometry.attributes.position.needsUpdate = true;

      const mat = pts.material as THREE.PointsMaterial;
      mat.size = (0.9 + breath * 0.4) * scale;
      updateMat(pts, [rr, gg, bb], iF, 1.6);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF * 1.2, scale);
    }
  }
}

/* ── 4D HYPERCUBE + HOPF FIBRATION mode ─────────────────────── */

// 16 vertices of tesseract: all (±1,±1,±1,±1) bit-pattern combinations
const T4_VERTS: [number, number, number, number][] = Array.from({ length: 16 }, (_, i) => [
  i & 1 ? 1 : -1,
  i & 2 ? 1 : -1,
  i & 4 ? 1 : -1,
  i & 8 ? 1 : -1,
]);

// 32 edges: every pair of vertices differing in exactly one coordinate
const T4_EDGES: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let bit = 0; bit < 4; bit++) {
      const j = i ^ (1 << bit);
      if (j > i) out.push([i, j]);
    }
  }
  return out;
})();

function buildHypercube(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['4D Crystal'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const group = new THREE.Group();

  // Tesseract edge segments — positions written every frame
  const edgePos = new Float32Array(T4_EDGES.length * 2 * 3);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
  const edges = new THREE.LineSegments(
    edgeGeo,
    lineMat(hdrColor([rr, gg, bb], iF * 0.9, 2.2), 1.0),
  );
  edges.userData.tag = 'hyperEdges';
  group.add(edges);

  // Hopf fibration circles — one circle per base point sampled on S²
  const N_FIBERS = 10;
  const FIBER_STEPS = 72;
  for (let fi = 0; fi < N_FIBERS; fi++) {
    const pos = new Float32Array((FIBER_STEPS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const fiber = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], iF * 0.55, 2.0), 0.85));
    fiber.userData.tag = 'hopfFiber';
    fiber.userData.fi = fi;
    fiber.userData.nf = N_FIBERS;
    fiber.userData.steps = FIBER_STEPS;
    group.add(fiber);
  }

  const center = buildCenter([rr, gg, bb], iF * 1.2, scale);
  center.userData.tag = 'center';
  group.add(center);
  return group;
}

function updateHypercube(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['4D Crystal'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;

  // Pre-compute sin/cos for all 6 planes of 4D rotation
  const sp = cfg.breathSpeed * 0.00028;
  const c0 = Math.cos(t * sp * 0.7),
    s0 = Math.sin(t * sp * 0.7); // XY
  const c1 = Math.cos(t * sp * 0.5),
    s1 = Math.sin(t * sp * 0.5); // XZ
  const c2 = Math.cos(t * sp * 1.1),
    s2 = Math.sin(t * sp * 1.1); // XW
  const c3 = Math.cos(t * sp * 0.9),
    s3 = Math.sin(t * sp * 0.9); // YZ
  const c4 = Math.cos(t * sp * 0.6),
    s4 = Math.sin(t * sp * 0.6); // YW
  const c5 = Math.cos(t * sp * 0.4),
    s5 = Math.sin(t * sp * 0.4); // ZW

  const rot4 = (
    vx: number,
    vy: number,
    vz: number,
    vw: number,
  ): [number, number, number, number] => {
    let x = vx,
      y = vy,
      z = vz,
      w = vw,
      tmp: number;
    tmp = x * c0 - y * s0;
    y = x * s0 + y * c0;
    x = tmp;
    tmp = x * c1 - z * s1;
    z = x * s1 + z * c1;
    x = tmp;
    tmp = x * c2 - w * s2;
    w = x * s2 + w * c2;
    x = tmp;
    tmp = y * c3 - z * s3;
    z = y * s3 + z * c3;
    y = tmp;
    tmp = y * c4 - w * s4;
    w = y * s4 + w * c4;
    y = tmp;
    tmp = z * c5 - w * s5;
    w = z * s5 + w * c5;
    z = tmp;
    return [x, y, z, w];
  };

  const proj4 = (x: number, y: number, _z: number, w: number): [number, number] => {
    const wf = 1.0 / (2.0 - w * 0.45);
    return [x * wf * R * 0.5, y * wf * R * 0.5];
  };

  // Pre-project all 16 tesseract vertices
  const vProj: [number, number][] = T4_VERTS.map(([vx, vy, vz, vw]) => {
    const [rx, ry, rz, rw] = rot4(vx, vy, vz, vw);
    return proj4(rx, ry, rz, rw);
  });

  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'hyperEdges') {
      const edges = child as THREE.LineSegments;
      const pos = edges.geometry.attributes.position.array as Float32Array;
      for (let ei = 0; ei < T4_EDGES.length; ei++) {
        const [ai, bi] = T4_EDGES[ei];
        pos[ei * 6] = vProj[ai][0];
        pos[ei * 6 + 1] = vProj[ai][1];
        pos[ei * 6 + 2] = 0;
        pos[ei * 6 + 3] = vProj[bi][0];
        pos[ei * 6 + 4] = vProj[bi][1];
        pos[ei * 6 + 5] = 0;
      }
      edges.geometry.attributes.position.needsUpdate = true;
      const br = iF * (0.7 + breath * 0.3) * 2.2;
      (edges.material as THREE.LineBasicMaterial).color.setRGB(
        (rr / 255) * br,
        (gg / 255) * br,
        (bb / 255) * br,
      );
    } else if (tag === 'hopfFiber') {
      const fiber = child as THREE.Line;
      const fi = fiber.userData.fi as number;
      const nf = fiber.userData.nf as number;
      const STEPS = fiber.userData.steps as number;

      // Golden-angle sampling of S² for base point of each fiber
      const theta = Math.acos(1 - 2 * ((fi + 0.5) / nf));
      const phi = fi * 2.399963 + t * 0.00012; // slow azimuthal drift
      const st = Math.sin(theta / 2),
        ct = Math.cos(theta / 2);

      const pos = fiber.geometry.attributes.position.array as Float32Array;
      for (let k = 0; k <= STEPS; k++) {
        const psi = (k / STEPS) * Math.PI * 2;
        // S³ point on this Hopf fiber
        const [rx, ry, rz, rw] = rot4(
          st * Math.cos(phi + psi),
          st * Math.sin(phi + psi),
          ct * Math.cos(psi),
          ct * Math.sin(psi),
        );
        const [px, py] = proj4(rx, ry, rz, rw);
        pos[k * 3] = px;
        pos[k * 3 + 1] = py;
        pos[k * 3 + 2] = 0;
      }
      fiber.geometry.attributes.position.needsUpdate = true;

      const br = iF * (0.4 + breath * 0.35) * 2.0;
      tmpCol.setHSL(fi / nf, 0.85, 0.55);
      (fiber.material as THREE.LineBasicMaterial).color.setRGB(
        tmpCol.r * br,
        tmpCol.g * br,
        tmpCol.b * br,
      );
      (fiber.material as THREE.LineBasicMaterial).opacity = 0.5 + breath * 0.35;
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF * 1.2, scale);
    }
  }
}

/* ── WARP DRIVE mode ────────────────────────────────────────── */

/* ── FIREWORK (warp) mode ────────────────────────────────────── */

const FW_PARTS_PER_BURST = 36;
const FW_MAX_BURSTS = 8;
const FW_TOTAL = FW_MAX_BURSTS * FW_PARTS_PER_BURST;

const FW_HUES = [0, 0.08, 0.15, 0.55, 0.65, 0.75, 0.85, 0.95];

function buildWarp(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Warp Drive'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const group = new THREE.Group();

  const px = new Float32Array(FW_TOTAL);
  const py = new Float32Array(FW_TOTAL);
  const vx = new Float32Array(FW_TOTAL);
  const vy = new Float32Array(FW_TOTAL);
  const age = new Float32Array(FW_TOTAL);
  const maxAge = new Float32Array(FW_TOTAL);
  const burstTimer = new Float32Array(FW_MAX_BURSTS);

  for (let b = 0; b < FW_MAX_BURSTS; b++) {
    burstTimer[b] = b * 18 + Math.random() * 12;
  }

  group.userData.fw = { px, py, vx, vy, age, maxAge, burstTimer, dead: true };

  for (let i = 0; i < FW_TOTAL; i++) {
    const pts = new Float32Array(6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], iF, 2.5), 1.0));
    line.userData.tag = 'fwParticle';
    line.userData.idx = i;
    group.add(line);
  }
  return group;
}

function updateWarp(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const fw = group.userData.fw as {
    px: Float32Array;
    py: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    age: Float32Array;
    maxAge: Float32Array;
    burstTimer: Float32Array;
  };
  const nBursts = Math.min(FW_MAX_BURSTS, Math.max(1, Math.round(cfg.particles)));
  const speed = cfg.breathSpeed;
  const gravity = 0.04 * speed;
  const burstR = R * (0.35 + cfg.glow * 0.055);
  const baseColor = new THREE.Color();

  for (let b = 0; b < nBursts; b++) {
    fw.burstTimer[b] -= speed;
    if (fw.burstTimer[b] <= 0) {
      const ang0 = Math.random() * Math.PI * 2;
      const dist = (0.1 + Math.random() * 0.55) * burstR;
      const cx = Math.cos(ang0) * dist;
      const cy = Math.sin(ang0) * dist * 0.6 + R * 0.1;
      const spd0 = burstR * (0.012 + Math.random() * 0.014) * speed;
      const nP = Math.max(8, Math.round(cfg.symmetry) * 2);
      const partsForBurst = Math.min(FW_PARTS_PER_BURST, nP);
      for (let p = 0; p < FW_PARTS_PER_BURST; p++) {
        const i = b * FW_PARTS_PER_BURST + p;
        if (p < partsForBurst) {
          const a = (p / partsForBurst) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
          const s = spd0 * (0.7 + Math.random() * 0.6);
          fw.px[i] = cx;
          fw.py[i] = cy;
          fw.vx[i] = Math.cos(a) * s;
          fw.vy[i] = Math.sin(a) * s;
          fw.age[i] = 0;
          fw.maxAge[i] = 55 + Math.random() * 30;
        } else {
          fw.age[i] = 99999;
          fw.maxAge[i] = 1;
        }
      }
      const interval = (35 + Math.random() * 40) / speed;
      fw.burstTimer[b] = interval;
    }
  }

  for (const child of group.children) {
    if (child.userData.tag !== 'fwParticle') continue;
    const idx = child.userData.idx as number;
    const line = child as THREE.Line;
    const pos = line.geometry.attributes.position.array as Float32Array;

    const b = Math.floor(idx / FW_PARTS_PER_BURST);
    const alive = b < nBursts && fw.age[idx] < fw.maxAge[idx];

    if (!alive) {
      pos[0] = pos[3] = 0;
      pos[1] = pos[4] = -9999;
      pos[2] = pos[5] = 0;
      line.geometry.attributes.position.needsUpdate = true;
      (line.material as THREE.LineBasicMaterial).opacity = 0;
      continue;
    }

    fw.vy[idx] -= gravity;
    fw.px[idx] += fw.vx[idx];
    fw.py[idx] += fw.vy[idx];
    fw.age[idx]++;

    const progress = fw.age[idx] / fw.maxAge[idx];
    const trailLen = (0.04 + (1 - progress) * 0.06) * R;
    const angle = Math.atan2(fw.vy[idx], fw.vx[idx]);

    pos[0] = fw.px[idx] - Math.cos(angle) * trailLen;
    pos[1] = fw.py[idx] - Math.sin(angle) * trailLen;
    pos[2] = 0;
    pos[3] = fw.px[idx];
    pos[4] = fw.py[idx];
    pos[5] = 0;
    line.geometry.attributes.position.needsUpdate = true;

    const hue = FW_HUES[b % FW_HUES.length];
    const saturation = 0.7 + cfg.complexity * 0.03;
    const lightness = (0.5 + (1 - progress) * 0.3) * iF * 0.8;
    baseColor.setHSL(hue, saturation, lightness);
    const mat = line.material as THREE.LineBasicMaterial;
    mat.color.copy(baseColor);
    mat.opacity = (1 - progress) ** 0.6 * 0.9;
  }
}

/* ── LORENZ ATTRACTOR (3D) mode ─────────────────────────────── */

function buildLorenz(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Lorenz Storm'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const N = 22000;
  const group = new THREE.Group();

  const pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  // Pre-warm — run ~500 steps to land on the attractor
  let lx = 0.1,
    ly = 0,
    lz = 10;
  const σ = 10,
    ρ = 28,
    β = 8 / 3,
    dt = 0.005;
  for (let i = 0; i < 500; i++) {
    const dx = σ * (ly - lx),
      dy = lx * (ρ - lz) - ly,
      dz = lx * ly - β * lz;
    lx += dx * dt;
    ly += dy * dt;
    lz += dz * dt;
  }

  const sc = R * 0.026; // Lorenz ~[-20,20]; sc*20 ≈ 0.52R
  for (let i = 0; i < N; i++) {
    const dx = σ * (ly - lx),
      dy = lx * (ρ - lz) - ly,
      dz = lx * ly - β * lz;
    lx += dx * dt;
    ly += dy * dt;
    lz += dz * dt;
    pos[i * 3] = lx * sc;
    pos[i * 3 + 1] = ly * sc;
    pos[i * 3 + 2] = (lz - 25) * sc;
  }

  const pts = new THREE.Points(geo, ptsMat(hdrColor([rr, gg, bb], iF, 1.6), 2.5 * scale, 0.65));
  pts.userData.tag = 'lorenzPts';
  pts.userData.N = N;
  pts.userData.lx = lx;
  pts.userData.ly = ly;
  pts.userData.lz = lz;
  pts.userData.wi = 0;
  group.add(pts);

  const center = buildCenter([rr, gg, bb], iF * 0.8, scale);
  center.userData.tag = 'center';
  group.add(center);
  return group;
}

function updateLorenz(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Lorenz Storm'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const layers = Math.max(1, Math.round(cfg.complexity));
  const σ = 10,
    ρ = 28,
    β = 8 / 3,
    dt = 0.005;
  const sc = R * 0.026;

  group.rotation.x = t * 0.00018 * cfg.breathSpeed;
  group.rotation.y = t * 0.00011 * cfg.breathSpeed;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'lorenzPts') {
      const pts = child as THREE.Points;
      const N = pts.userData.N as number;
      const pos = pts.geometry.attributes.position.array as Float32Array;
      let lx = pts.userData.lx as number;
      let ly = pts.userData.ly as number;
      let lz = pts.userData.lz as number;
      let wi = pts.userData.wi as number;

      const ptsPerFrame = 50 + layers * 40;
      for (let i = 0; i < ptsPerFrame; i++) {
        const dx = σ * (ly - lx),
          dy = lx * (ρ - lz) - ly,
          dz = lx * ly - β * lz;
        lx += dx * dt;
        ly += dy * dt;
        lz += dz * dt;
        pos[wi * 3] = lx * sc;
        pos[wi * 3 + 1] = ly * sc;
        pos[wi * 3 + 2] = (lz - 25) * sc;
        wi = (wi + 1) % N;
      }

      pts.userData.lx = lx;
      pts.userData.ly = ly;
      pts.userData.lz = lz;
      pts.userData.wi = wi;
      pts.geometry.attributes.position.needsUpdate = true;
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = (2.1 + breath * 0.8) * scale;
      updateMat(pts, [rr, gg, bb], iF, 1.6);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF * 0.8, scale);
    }
  }
}

/* ── TORUS KNOT (3D) mode ───────────────────────────────────── */

// (p, q) pairs — each coprime pair gives a distinct knot topology
const KNOT_PQ: [number, number][] = [
  [2, 3],
  [3, 2],
  [3, 4],
  [4, 3],
  [5, 2],
  [5, 3],
  [7, 3],
  [7, 4],
  [5, 7],
];

function buildKnot(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Knot Garden'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const group = new THREE.Group();
  const [p, q] = KNOT_PQ[Math.min(Math.max(0, Math.round(cfg.complexity) - 1), KNOT_PQ.length - 1)];
  const strands = Math.max(1, Math.min(6, Math.round(cfg.symmetry)));
  const STEPS = 600;
  const TAU = Math.PI * 2;
  const bigR = R * 0.36,
    smallR = R * 0.12;

  for (let si = 0; si < strands; si++) {
    const phaseOff = (si / strands) * TAU;
    const pts = new Float32Array((STEPS + 1) * 3);
    for (let i = 0; i <= STEPS; i++) {
      const t2 = (i / STEPS) * TAU;
      const phi = p * t2 + phaseOff * 0.3;
      const theta = q * t2;
      const rT = bigR + smallR * Math.cos(theta);
      pts[i * 3] = rT * Math.cos(phi);
      pts[i * 3 + 1] = rT * Math.sin(phi);
      pts[i * 3 + 2] = smallR * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const brightness = si === 0 ? iF * 1.1 : iF * 0.55;
    const hue = si / strands;
    const col = new THREE.Color().setHSL(hue, 0.8, 0.55);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(
        col.r * brightness * 2.2,
        col.g * brightness * 2.2,
        col.b * brightness * 2.2,
      ),
      transparent: true,
      opacity: si === 0 ? 0.95 : 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const strand = new THREE.Line(geo, mat);
    strand.userData.tag = 'knotStrand';
    strand.userData.hue0 = hue;
    group.add(strand);
  }

  void rr;
  void gg;
  void bb;
  return group;
}

function updateKnot(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;

  group.rotation.x = t * 0.00022 * cfg.breathSpeed;
  group.rotation.y = t * 0.00015 * cfg.breathSpeed;
  group.rotation.z = t * 0.00008 * cfg.breathSpeed;

  const tmpCol = new THREE.Color();
  let strandIdx = 0;
  for (const child of group.children) {
    if (child.userData.tag !== 'knotStrand') continue;
    const hue = ((child.userData.hue0 as number) + t * 0.000055) % 1.0;
    const br = iF * (strandIdx === 0 ? 0.9 + breath * 0.2 : 0.4 + breath * 0.25) * 2.2;
    tmpCol.setHSL(hue, 0.82, 0.55);
    const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
    mat.color.setRGB(tmpCol.r * br, tmpCol.g * br, tmpCol.b * br);
    mat.opacity = strandIdx === 0 ? 0.9 : 0.5 + breath * 0.25;
    strandIdx++;
  }
  void R;
}

/* ── ATOMIC ORBITAL (3D) mode ───────────────────────────────── */

// (l, m) quantum number pairs — each gives a distinct orbital shape
const ORBITAL_LM: [number, number][] = [
  [1, 0], // p_z: two lobes
  [2, 0], // d_z²: figure-8 + ring
  [2, 2], // d_x²-y²: 4 petals
  [3, 0], // f_z³: 8 lobes
  [3, 2], // f complex
  [3, 3], // f 6-petal
  [4, 0], // g_0 complex
  [4, 4], // g 8-petal
];

function realSH(l: number, m: number, theta: number, phi: number): number {
  const c = Math.cos(theta),
    s = Math.sin(theta);
  const c2 = c * c,
    s2 = s * s;
  if (l === 1) {
    if (m === 0) return c;
    if (m === 1) return s * Math.cos(phi);
    if (m === -1) return s * Math.sin(phi);
  }
  if (l === 2) {
    if (m === 0) return (3 * c2 - 1) * 0.5;
    if (m === 1) return s * c * Math.cos(phi);
    if (m === -1) return s * c * Math.sin(phi);
    if (m === 2) return s2 * Math.cos(2 * phi);
    if (m === -2) return s2 * Math.sin(2 * phi);
  }
  if (l === 3) {
    if (m === 0) return c * (5 * c2 - 3) * 0.5;
    if (m === 1) return s * (5 * c2 - 1) * Math.cos(phi) * 0.5;
    if (m === -1) return s * (5 * c2 - 1) * Math.sin(phi) * 0.5;
    if (m === 2) return s2 * c * Math.cos(2 * phi);
    if (m === -2) return s2 * c * Math.sin(2 * phi);
    if (m === 3) return s2 * s * Math.cos(3 * phi);
    if (m === -3) return s2 * s * Math.sin(3 * phi);
  }
  if (l === 4) {
    if (m === 0) return (35 * c2 * c2 - 30 * c2 + 3) * 0.125;
    if (m === 2) return s2 * (7 * c2 - 1) * Math.cos(2 * phi) * 0.5;
    if (m === -2) return s2 * (7 * c2 - 1) * Math.sin(2 * phi) * 0.5;
    if (m === 4) return s2 * s2 * Math.cos(4 * phi);
    if (m === -4) return s2 * s2 * Math.sin(4 * phi);
  }
  return 0;
}

function buildOrbital(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Orbital Shell'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const group = new THREE.Group();

  const idx = Math.min(Math.max(0, Math.round(cfg.complexity) - 1), ORBITAL_LM.length - 1);
  const [l, m] = ORBITAL_LM[idx];

  const NΘ = 64,
    NΦ = 128;

  // Meridional lines (constant φ, vary θ)
  for (let pi = 0; pi < NΦ; pi += 4) {
    const phi = (pi / NΦ) * Math.PI * 2;
    const pts = new Float32Array((NΘ + 1) * 3);
    for (let ti = 0; ti <= NΘ; ti++) {
      const theta = (ti / NΘ) * Math.PI;
      const sh = realSH(l, m, theta, phi);
      const r = R * 0.52 * sh * sh;
      pts[ti * 3] = r * Math.sin(theta) * Math.cos(phi);
      pts[ti * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      pts[ti * 3 + 2] = r * Math.cos(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], iF * 0.65, 2.0), 0.85));
    line.userData.tag = 'orbMerid';
    group.add(line);
  }

  // Latitudinal lines (constant θ, vary φ)
  for (let ti = 1; ti < NΘ; ti += 3) {
    const theta = (ti / NΘ) * Math.PI;
    const pts = new Float32Array((NΦ + 1) * 3);
    for (let pi = 0; pi <= NΦ; pi++) {
      const phi = (pi / NΦ) * Math.PI * 2;
      const sh = realSH(l, m, theta, phi);
      const r = R * 0.52 * sh * sh;
      pts[pi * 3] = r * Math.sin(theta) * Math.cos(phi);
      pts[pi * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      pts[pi * 3 + 2] = r * Math.cos(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(geo, lineMat(hdrColor([rr, gg, bb], iF * 0.45, 1.8), 0.7));
    line.userData.tag = 'orbLat';
    group.add(line);
  }

  return group;
}

function updateOrbital(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Orbital Shell'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;

  group.rotation.x = t * 0.00019 * cfg.breathSpeed;
  group.rotation.y = t * 0.00013 * cfg.breathSpeed;
  group.rotation.z = t * 0.00007 * cfg.breathSpeed;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    const baseBr = tag === 'orbMerid' ? 0.6 + breath * 0.25 : 0.4 + breath * 0.2;
    const mult = tag === 'orbMerid' ? 2.0 : 1.8;
    updateMat(child as THREE.Object3D, [rr, gg, bb], iF * baseBr, mult);
  }
  void R;
}

/* ── GEODESIC CRYSTAL (3D) mode ─────────────────────────────── */

function makeEdgeLines(
  geo: THREE.BufferGeometry,
  rgb: [number, number, number],
  iF: number,
  mult: number,
  opacity: number,
): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(geo);
  geo.dispose();
  return new THREE.LineSegments(edges, lineMat(hdrColor(rgb, iF, mult), opacity));
}

// Form index → builder function returning geometry (scale=1, caller sets scale)
const GEO_FORMS: ((s: number) => THREE.BufferGeometry)[] = [
  (s) => new THREE.TetrahedronGeometry(s),
  (s) => new THREE.OctahedronGeometry(s),
  (s) => new THREE.BoxGeometry(s, s, s),
  (s) => new THREE.DodecahedronGeometry(s),
  (s) => new THREE.IcosahedronGeometry(s),
  (s) => new THREE.IcosahedronGeometry(s, 2), // geodesic sphere
  (s) => new THREE.IcosahedronGeometry(s, 3), // finer geodesic
];

function buildGeodesic(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Crystal Lattice'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const group = new THREE.Group();

  const formIdx = Math.min(Math.max(0, Math.round(cfg.complexity) - 1), GEO_FORMS.length - 1);
  const shells = Math.max(1, Math.min(5, Math.round(cfg.symmetry)));
  const tmpCol = new THREE.Color();

  for (let sh = 1; sh <= shells; sh++) {
    const frac = sh / shells;
    const s = R * 0.78 * frac;
    const hue = frac * 0.72;
    const br = (0.25 + frac * 0.75) * iF;
    tmpCol.setHSL(hue, 0.75, 0.55);
    const col: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
    const lines = makeEdgeLines(GEO_FORMS[formIdx](s), col, br, 2.4, 0.9 - sh * 0.08);
    lines.userData.tag = 'geoPoly';
    lines.userData.rotDir = sh % 2 === 0 ? 1 : -1;
    lines.userData.hue0 = hue;
    group.add(lines);

    // Dual or companion form for the outermost shell
    if (sh === shells && formIdx <= 1) {
      const dualIdx = formIdx === 0 ? 1 : 0;
      const dualLines = makeEdgeLines(
        GEO_FORMS[dualIdx](s * 0.9),
        [rr, gg, bb],
        br * 0.45,
        2.0,
        0.55,
      );
      dualLines.userData.tag = 'geoPoly';
      dualLines.userData.rotDir = -1;
      dualLines.userData.hue0 = (hue + 0.5) % 1.0;
      group.add(dualLines);
    }
  }

  const center = buildCenter([rr, gg, bb], iF * 1.2, R / 210);
  center.userData.tag = 'center';
  group.add(center);
  return group;
}

function updateGeodesic(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Crystal Lattice'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const scale = R / 210;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;

  group.rotation.x = t * 0.00016 * cfg.breathSpeed;
  group.rotation.y = t * 0.00022 * cfg.breathSpeed;

  const tmpCol = new THREE.Color();
  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'geoPoly') {
      const hue = ((child.userData.hue0 as number) + t * 0.000035) % 1.0;
      const br = iF * (0.45 + breath * 0.45) * 2.4;
      tmpCol.setHSL(hue, 0.75, 0.55);
      const mat = (child as THREE.LineSegments).material as THREE.LineBasicMaterial;
      mat.color.setRGB(tmpCol.r * br, tmpCol.g * br, tmpCol.b * br);
      mat.opacity = 0.55 + breath * 0.35;
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF * 1.2, scale);
    }
  }
}

/* ── ISLAMIC mode — girih star polygon geometry ─────────────── */

function starPolygonPts(n: number, r1: number, r2: number): Float32Array {
  const pts = new Float32Array((n * 2 + 1) * 3);
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    pts[i * 3] = Math.cos(a) * r;
    pts[i * 3 + 1] = Math.sin(a) * r;
    pts[i * 3 + 2] = 0;
  }
  return pts;
}

function buildIslamic(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Islamic Garden'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const n = Math.max(6, Math.round(cfg.symmetry));
  const layers = Math.max(1, Math.round(cfg.complexity));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  for (let l = 1; l <= layers; l++) {
    const r1 = R * (l / layers);
    const r2 = r1 * 0.42;
    const hue = ((l / layers) * 0.6) % 1.0;
    tmpCol.setHSL(hue, 0.85, 0.55);
    const col: [number, number, number] = [
      lerp(rr, tmpCol.r * 255, cfg.glow / 10),
      lerp(gg, tmpCol.g * 255, cfg.glow / 10),
      lerp(bb, tmpCol.b * 255, cfg.glow / 10),
    ];
    const pts = starPolygonPts(n, r1, r2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const star = new THREE.Line(
      geo,
      lineMat(hdrColor(col, iF * (0.5 + (l / layers) * 0.5), 2.0), 0.9),
    );
    star.userData.tag = 'islamicStar';
    star.userData.hue = hue;
    star.userData.layer = l;
    star.userData.baseR = r1;
    star.userData.dir = l % 2 === 0 ? 1 : -1;
    group.add(star);
  }

  // Inner ring of smaller stars arranged in a circle
  const ringN = n;
  const ringR = R * 0.48;
  const smallR = R * 0.18;
  for (let i = 0; i < ringN; i++) {
    const ang = (i / ringN) * Math.PI * 2;
    const hue = ((i / ringN) * 0.4 + 0.5) % 1.0;
    tmpCol.setHSL(hue, 0.9, 0.55);
    const col: [number, number, number] = [
      lerp(rr, tmpCol.r * 255, (cfg.glow / 10) * 0.8),
      lerp(gg, tmpCol.g * 255, (cfg.glow / 10) * 0.8),
      lerp(bb, tmpCol.b * 255, (cfg.glow / 10) * 0.8),
    ];
    const pts = starPolygonPts(6, smallR, smallR * 0.4);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const sub = new THREE.Line(geo, lineMat(hdrColor(col, iF * 0.6, 1.8), 0.75));
    sub.position.set(Math.cos(ang) * ringR, Math.sin(ang) * ringR, 0);
    sub.userData.tag = 'islamicRingStar';
    sub.userData.hue = hue;
    sub.userData.angle = ang;
    group.add(sub);
  }

  // Connecting geometry — lines from outer star tips to neighbours
  const TAU = Math.PI * 2;
  const outerR = R;
  const connPts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU - Math.PI / 2;
    const a1 = ((i + 1) / n) * TAU - Math.PI / 2;
    connPts.push(
      Math.cos(a0) * outerR,
      Math.sin(a0) * outerR,
      0,
      Math.cos(a1) * outerR * 0.65,
      Math.sin(a1) * outerR * 0.65,
      0,
    );
  }
  const connGeo = new THREE.BufferGeometry();
  connGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(connPts), 3));
  const conn = new THREE.LineSegments(connGeo, lineMat(hdrColor([rr, gg, bb], iF * 0.3, 1.5), 0.6));
  conn.userData.tag = 'islamicConn';
  group.add(conn);

  const center = buildCenter([rr, gg, bb], iF * 0.9, R / 210);
  center.userData.tag = 'center';
  group.add(center);

  return group;
}

function updateIslamic(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Islamic Garden'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const timeHue = (t * 0.00006) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'islamicStar') {
      const hue = ((child.userData.hue as number) + timeHue) % 1.0;
      tmpCol.setHSL(hue, 0.85, 0.55);
      const col: [number, number, number] = [
        lerp(rr, tmpCol.r * 255, cfg.glow / 10),
        lerp(gg, tmpCol.g * 255, cfg.glow / 10),
        lerp(bb, tmpCol.b * 255, cfg.glow / 10),
      ];
      const dir = child.userData.dir as number;
      child.rotation.z = t * 0.00008 * cfg.breathSpeed * dir;
      child.scale.setScalar(0.94 + breath * 0.06);
      updateMat(
        child as THREE.Object3D,
        col,
        iF * (0.5 + ((child.userData.layer as number) / 5) * 0.5),
        2.0,
      );
    } else if (tag === 'islamicRingStar') {
      const hue = ((child.userData.hue as number) + timeHue * 1.5) % 1.0;
      tmpCol.setHSL(hue, 0.9, 0.55);
      const col: [number, number, number] = [
        lerp(rr, tmpCol.r * 255, (cfg.glow / 10) * 0.8),
        lerp(gg, tmpCol.g * 255, (cfg.glow / 10) * 0.8),
        lerp(bb, tmpCol.b * 255, (cfg.glow / 10) * 0.8),
      ];
      child.rotation.z = t * 0.00022 * cfg.breathSpeed;
      updateMat(child as THREE.Object3D, col, iF * 0.6, 1.8);
    } else if (tag === 'islamicConn') {
      child.rotation.z = t * 0.00005 * cfg.breathSpeed;
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF * 0.3, 1.5);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF * 0.9, R / 210);
    }
  }
}

/* ── YANTRA mode — sacred Hindu triangle geometry ───────────── */

function buildYantra(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Yantra Fire'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const nPairs = Math.max(2, Math.round(cfg.complexity));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();
  const TAU = Math.PI * 2;

  // Nested interlocking up/down triangles
  for (let i = 1; i <= nPairs; i++) {
    const r = R * (i / nPairs) * 0.88;
    const brightness = iF * (0.4 + (i / nPairs) * 0.6);
    const hue = ((i / nPairs) * 0.45) % 1.0;
    tmpCol.setHSL(hue, 0.9, 0.55);
    const col: [number, number, number] = [
      lerp(rr, tmpCol.r * 255, cfg.glow / 10),
      lerp(gg, tmpCol.g * 255, cfg.glow / 10),
      lerp(bb, tmpCol.b * 255, cfg.glow / 10),
    ];

    // Upward triangle (Shiva)
    const upPts = new Float32Array(4 * 3);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU - Math.PI / 2;
      upPts[k * 3] = Math.cos(a) * r;
      upPts[k * 3 + 1] = Math.sin(a) * r;
    }
    upPts[9] = upPts[0];
    upPts[10] = upPts[1];
    upPts[11] = 0;
    const upGeo = new THREE.BufferGeometry();
    upGeo.setAttribute('position', new THREE.BufferAttribute(upPts, 3));
    const up = new THREE.Line(upGeo, lineMat(hdrColor(col, brightness, 2.0), 0.9));
    up.userData.tag = 'yantraUp';
    up.userData.hue = hue;
    up.userData.layer = i;
    up.userData.baseR = r;
    group.add(up);

    // Downward triangle (Shakti) — slightly smaller, inverted
    const downR = r * 0.88;
    const downPts = new Float32Array(4 * 3);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU + Math.PI / 2;
      downPts[k * 3] = Math.cos(a) * downR;
      downPts[k * 3 + 1] = Math.sin(a) * downR;
    }
    downPts[9] = downPts[0];
    downPts[10] = downPts[1];
    downPts[11] = 0;
    const downGeo = new THREE.BufferGeometry();
    downGeo.setAttribute('position', new THREE.BufferAttribute(downPts, 3));
    const hue2 = (hue + 0.18) % 1.0;
    tmpCol.setHSL(hue2, 0.85, 0.55);
    const col2: [number, number, number] = [
      lerp(rr, tmpCol.r * 255, cfg.glow / 10),
      lerp(gg, tmpCol.g * 255, cfg.glow / 10),
      lerp(bb, tmpCol.b * 255, cfg.glow / 10),
    ];
    const down = new THREE.Line(downGeo, lineMat(hdrColor(col2, brightness * 0.85, 1.8), 0.85));
    down.userData.tag = 'yantraDown';
    down.userData.hue = hue2;
    down.userData.layer = i;
    group.add(down);
  }

  // Lotus petal ring — 8 petals
  const petalSym = Math.max(4, Math.round(cfg.symmetry));
  const petalR = R * 0.32;
  for (let s = 0; s < petalSym; s++) {
    const ang = (s / petalSym) * TAU;
    const px = Math.cos(ang) * petalR;
    const py = Math.sin(ang) * petalR;
    const pw = petalR * 0.35;
    const ph = petalR * 0.55;
    const pts: number[] = [];
    const N = 16;
    for (let k = 0; k <= N; k++) {
      const ti = k / N;
      const a = ti * Math.PI * 2;
      pts.push(px + Math.cos(a) * pw * Math.sin(ti * Math.PI), py + Math.sin(a) * ph * 0.5, 0);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    const hue3 = ((s / petalSym) * 0.3 + 0.55) % 1.0;
    tmpCol.setHSL(hue3, 0.8, 0.55);
    const col3: [number, number, number] = [
      lerp(rr, tmpCol.r * 255, (cfg.glow / 10) * 0.7),
      lerp(gg, tmpCol.g * 255, (cfg.glow / 10) * 0.7),
      lerp(bb, tmpCol.b * 255, (cfg.glow / 10) * 0.7),
    ];
    const petal = new THREE.Line(pGeo, lineMat(hdrColor(col3, iF * 0.5, 1.6), 0.7));
    petal.userData.tag = 'yantraPetal';
    petal.userData.hue = hue3;
    group.add(petal);
  }

  // Bindu (central point) + circles
  for (let ci = 1; ci <= 3; ci++) {
    const cr = R * 0.12 * ci;
    const ring = new THREE.Line(circleGeo(48), lineMat(hdrColor([rr, gg, bb], iF * 0.6, 1.8), 0.7));
    ring.scale.setScalar(cr);
    ring.userData.tag = 'yantraCircle';
    ring.userData.baseR = cr;
    group.add(ring);
  }

  const center = buildCenter([rr, gg, bb], iF, R / 210);
  center.userData.tag = 'center';
  group.add(center);

  return group;
}

function updateYantra(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Yantra Fire'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const timeHue = (t * 0.00005) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'yantraUp' || tag === 'yantraDown') {
      const hue = ((child.userData.hue as number) + timeHue) % 1.0;
      tmpCol.setHSL(hue, 0.9, 0.55);
      const col: [number, number, number] = [
        lerp(rr, tmpCol.r * 255, cfg.glow / 10),
        lerp(gg, tmpCol.g * 255, cfg.glow / 10),
        lerp(bb, tmpCol.b * 255, cfg.glow / 10),
      ];
      const l = child.userData.layer as number;
      const bs = 0.94 + breath * 0.06;
      child.scale.setScalar(bs);
      child.rotation.z = t * 0.000035 * cfg.breathSpeed * (tag === 'yantraUp' ? 1 : -1);
      updateMat(child as THREE.Object3D, col, iF * (0.4 + (l / 5) * 0.6), 2.0);
    } else if (tag === 'yantraPetal') {
      const hue = ((child.userData.hue as number) + timeHue * 1.5) % 1.0;
      tmpCol.setHSL(hue, 0.8, 0.55);
      const col: [number, number, number] = [
        lerp(rr, tmpCol.r * 255, (cfg.glow / 10) * 0.7),
        lerp(gg, tmpCol.g * 255, (cfg.glow / 10) * 0.7),
        lerp(bb, tmpCol.b * 255, (cfg.glow / 10) * 0.7),
      ];
      child.rotation.z = t * 0.00012 * cfg.breathSpeed;
      updateMat(child as THREE.Object3D, col, iF * 0.5, 1.6);
    } else if (tag === 'yantraCircle') {
      const bs = 0.95 + breath * 0.05;
      child.scale.setScalar((child.userData.baseR as number) * bs);
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF * 0.6, 1.8);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF, R / 210);
    }
  }
}

/* ── CELTIC mode — interlocking torus knot bands ────────────── */

function buildCeltic(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Celtic Forest'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const nKnots = Math.max(1, Math.min(4, Math.round(cfg.complexity)));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();
  const N = 800;

  const knotDefs: [number, number][] = [
    [2, 3],
    [3, 5],
    [2, 5],
    [3, 7],
  ];

  for (let ki = 0; ki < nKnots; ki++) {
    const [p, q] = knotDefs[ki];
    const pts = new Float32Array((N + 1) * 3);
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const r = Math.cos(q * t) + 2.4;
      pts[i * 3] = r * Math.cos(p * t) * R * 0.36;
      pts[i * 3 + 1] = r * Math.sin(p * t) * R * 0.36;
      pts[i * 3 + 2] = -Math.sin(q * t) * R * 0.18;
    }
    const hue = ((ki / nKnots) * 0.45 + 0.2) % 1.0;
    tmpCol.setHSL(hue, 0.9, 0.55);
    const col: [number, number, number] = [
      lerp(rr, tmpCol.r * 255, cfg.glow / 10),
      lerp(gg, tmpCol.g * 255, cfg.glow / 10),
      lerp(bb, tmpCol.b * 255, cfg.glow / 10),
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const knot = new THREE.Line(geo, lineMat(hdrColor(col, iF * (0.5 + ki * 0.1), 2.0), 0.85));
    knot.userData.tag = 'celticKnot';
    knot.userData.hue = hue;
    knot.userData.ki = ki;
    group.add(knot);
  }

  // Interlocking rings border
  const sym = Math.max(4, Math.round(cfg.symmetry));
  const ringR = R * 0.9;
  for (let s = 0; s < sym; s++) {
    const ang = (s / sym) * Math.PI * 2;
    const ring = new THREE.Line(circleGeo(32), lineMat(hdrColor([rr, gg, bb], iF * 0.3, 1.5), 0.5));
    const subR = ((ringR * Math.PI) / sym) * 0.55;
    ring.scale.setScalar(subR);
    ring.position.set(Math.cos(ang) * ringR, Math.sin(ang) * ringR, 0);
    ring.userData.tag = 'celticRing';
    ring.userData.ang = ang;
    ring.userData.baseR = subR;
    group.add(ring);
  }

  const center = buildCenter([rr, gg, bb], iF * 0.8, R / 210);
  center.userData.tag = 'center';
  group.add(center);

  return group;
}

function updateCeltic(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Celtic Forest'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const breath = (Math.sin(t * 0.001 * cfg.breathSpeed) + 1) * 0.5;
  const timeHue = (t * 0.00006) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'celticKnot') {
      const ki = child.userData.ki as number;
      const hue = ((child.userData.hue as number) + timeHue) % 1.0;
      tmpCol.setHSL(hue, 0.9, 0.55);
      const col: [number, number, number] = [
        lerp(rr, tmpCol.r * 255, cfg.glow / 10),
        lerp(gg, tmpCol.g * 255, cfg.glow / 10),
        lerp(bb, tmpCol.b * 255, cfg.glow / 10),
      ];
      child.rotation.z = t * 0.00014 * cfg.breathSpeed * (ki % 2 === 0 ? 1 : -1);
      updateMat(child as THREE.Object3D, col, iF * (0.5 + ki * 0.1), 2.0);
    } else if (tag === 'celticRing') {
      child.scale.setScalar((child.userData.baseR as number) * (0.9 + breath * 0.1));
      child.rotation.z = t * 0.00025 * cfg.breathSpeed;
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF * 0.3, 1.5);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF * 0.8, R / 210);
    }
  }
}

/* ── RAINBOW mode — multi-colour laser dome ─────────────────── */

function buildRainbow(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const sym = Math.max(0, Math.round(cfg.symmetry));
  const layers = Math.max(2, Math.round(cfg.complexity));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  // Concentric coloured rings — each ring a different hue
  for (let i = 1; i <= layers; i++) {
    const hue = (i / layers) % 1.0;
    const r = R * (i / layers);
    tmpCol.setHSL(hue, 1.0, 0.55);
    const col: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
    const ring = new THREE.Line(
      circleGeo(96),
      lineMat(hdrColor(col, cfg.intensity / 10, 2.2), 1.0),
    );
    ring.scale.setScalar(r);
    ring.userData.tag = 'rainbowRing';
    ring.userData.hue = hue;
    ring.userData.baseR = r;
    ring.userData.layer = i;
    group.add(ring);
  }

  // Radial spoke lines — each spoke in a different hue
  for (let s = 0; s < sym; s++) {
    const hue = (s / sym + 0.1) % 1.0;
    tmpCol.setHSL(hue, 1.0, 0.6);
    const col: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
    const a = (s / sym) * TAU;
    const pts = new Float32Array([0, 0, 0, Math.cos(a) * R, Math.sin(a) * R, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const spoke = new THREE.Line(geo, lineMat(hdrColor(col, (cfg.intensity / 10) * 0.6, 1.8), 1.0));
    spoke.userData.tag = 'rainbowSpoke';
    spoke.userData.hue = hue;
    spoke.userData.angle = s / sym;
    group.add(spoke);
  }

  // Dome polygon outline — icosahedron projected 2D
  const icoGeo = new THREE.IcosahedronGeometry(R * 0.92, 1);
  const edges = new THREE.EdgesGeometry(icoGeo);
  icoGeo.dispose();
  const domeColor = new THREE.Color();
  domeColor.setHSL(0.0, 1.0, 0.55);
  const dome = new THREE.LineSegments(
    edges,
    lineMat(hdrColor([255, 255, 255], (cfg.intensity / 10) * 0.25, 1.5), 0.8),
  );
  dome.userData.tag = 'rainbowDome';
  group.add(dome);

  return group;
}

function updateRainbow(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const breath = (Math.sin(t * 0.001 * breathSpeed) + 1) * 0.5;
  const timeHue = (t * 0.00008) % 1.0;
  // glow 0..10 controls colour saturation: 0 = monochrome (use palette), 10 = full rainbow
  const rainbow = cfg.glow / 10;
  const tmpCol = new THREE.Color();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'rainbowRing') {
      const hue = ((child.userData.hue as number) + timeHue) % 1.0;
      // Blend between palette colour and full rainbow
      const rainbowRgb: [number, number, number] = [0, 0, 0];
      tmpCol.setHSL(hue, 1.0, 0.55);
      rainbowRgb[0] = lerp(pal.rgb[0], tmpCol.r * 255, rainbow);
      rainbowRgb[1] = lerp(pal.rgb[1], tmpCol.g * 255, rainbow);
      rainbowRgb[2] = lerp(pal.rgb[2], tmpCol.b * 255, rainbow);
      const bs = 0.88 + breath * 0.12;
      child.scale.setScalar((child.userData.baseR as number) * bs);
      child.rotation.z = t * 0.00012 * breathSpeed * (child.userData.layer % 2 === 0 ? 1 : -1);
      updateMat(child as THREE.Object3D, rainbowRgb, iF, 2.2);
    } else if (tag === 'rainbowSpoke') {
      const hue = ((child.userData.hue as number) + timeHue * 0.5) % 1.0;
      const rainbowRgb: [number, number, number] = [0, 0, 0];
      tmpCol.setHSL(hue, 1.0, 0.6);
      rainbowRgb[0] = lerp(pal.rgb[0], tmpCol.r * 255, rainbow);
      rainbowRgb[1] = lerp(pal.rgb[1], tmpCol.g * 255, rainbow);
      rainbowRgb[2] = lerp(pal.rgb[2], tmpCol.b * 255, rainbow);
      child.rotation.z = t * 0.00006 * breathSpeed;
      updateMat(child as THREE.Object3D, rainbowRgb, iF * 0.6, 1.8);
    } else if (tag === 'rainbowDome') {
      child.rotation.x = t * 0.00018 * breathSpeed;
      child.rotation.y = t * 0.00022 * breathSpeed;
      const wRgb: [number, number, number] = [
        lerp(pal.rgb[0], 255, rainbow * 0.4),
        lerp(pal.rgb[1], 255, rainbow * 0.4),
        lerp(pal.rgb[2], 255, rainbow * 0.4),
      ];
      updateMat(child as THREE.Object3D, wRgb, iF * 0.25, 1.5);
    }
  }
}

/* ── PRISM / PRISM3D modes — diffuse spectral light halos ───── */

const SPEC_HUES = [0.0, 0.06, 0.14, 0.33, 0.55, 0.68, 0.78]; // ROYGBIV

function buildPrism(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const facets = Math.max(3, Math.round(cfg.symmetry));
  const rings = Math.max(2, Math.round(cfg.complexity));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();
  const rnd = (n = 1) => (Math.random() - 0.5) * 2 * n;

  // Warm nucleus: concentric particle halos from white-hot center → amber → gold
  for (let n = 0; n < 5; n++) {
    const frac = n / 4;
    const nr = 0.06 + frac * 0.22;
    const hue = lerp(0.085, 0.05, frac);
    tmpCol.setHSL(hue, lerp(0.88, 1.0, frac), lerp(0.5, 0.43, frac));
    const pCount = Math.max(20, Math.round(lerp(200, 60, frac) * iF));
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const a = (i / pCount) * TAU + rnd(0.12);
      const r = 1.0 + rnd(0.14);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      geo,
      circlePtsMat(
        hdrColor([tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255], iF, lerp(2.45, 1.55, frac)),
        lerp(3.1, 2.0, frac),
        lerp(0.72, 0.28, frac),
      ),
    );
    pts.scale.setScalar(nr * R);
    pts.userData.tag = 'prismNucleus';
    pts.userData.layer = n;
    pts.userData.baseR = nr * R;
    pts.userData.hue = hue;
    group.add(pts);
  }

  // Spectral halo rings — point halos, arc coverage shrinks at low glow
  for (let ri = 0; ri < rings; ri++) {
    const hue = SPEC_HUES[ri % SPEC_HUES.length];
    const ringR = R * (0.3 + (ri / Math.max(1, rings - 1)) * 0.64);
    tmpCol.setHSL(hue, 1.0, 0.6);
    const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
    // Band width: wide/diffuse at high glow, narrow/crisp at low glow
    const bandHalf = lerp(0.025, 0.22, glowF);
    // Arc coverage per facet sector (0=55% covered with 45% gap, 1=98% almost closed)
    const arcFrac = lerp(0.55, 0.98, glowF);
    const pCount = Math.max(20, Math.round(lerp(120, 320, iF)));
    const positions: number[] = [];

    for (let i = 0; i < pCount; i++) {
      const rawA = (i / pCount) * TAU + rnd(0.06);
      if (glowF < 0.95) {
        const sectorPos = ((((rawA / TAU) * facets) % 1) + 1) % 1;
        if (sectorPos > arcFrac) continue;
      }
      const r = 1.0 + rnd(bandHalf);
      positions.push(Math.cos(rawA) * r, Math.sin(rawA) * r, 0);
    }

    if (positions.length < 3) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const ptSize = lerp(3.8, 2.2, ri / Math.max(1, rings - 1));
    const opacity = lerp(0.78, 0.45, ri / Math.max(1, rings - 1));
    const pts = new THREE.Points(geo, circlePtsMat(hdrColor(rgb, iF, 2.6), ptSize, opacity));
    pts.scale.setScalar(ringR);
    pts.userData.tag = 'prismRing';
    pts.userData.hue = hue;
    pts.userData.layer = ri;
    pts.userData.baseR = ringR;
    group.add(pts);
  }

  // Diffuse light spokes — sparse particle rays from centre outward
  for (let s = 0; s < facets; s++) {
    const ang = (s / facets) * TAU;
    const hue = SPEC_HUES[s % SPEC_HUES.length];
    tmpCol.setHSL(hue, 1.0, 0.72);
    const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
    const pCount = Math.max(10, Math.round(lerp(18, 45, iF)));
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const d = Math.random() ** 0.55 * R * 0.3;
      const spread = d * 0.07;
      pos[i * 3] = Math.cos(ang) * d + rnd(spread);
      pos[i * 3 + 1] = Math.sin(ang) * d + rnd(spread);
      pos[i * 3 + 2] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      geo,
      circlePtsMat(hdrColor(rgb, iF, 2.0), 2.6, lerp(0.55, 0.15, glowF)),
    );
    pts.userData.tag = 'prismSpoke';
    pts.userData.hue = hue;
    pts.userData.ang = ang;
    group.add(pts);
  }

  return group;
}

function updatePrism(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const breath = (Math.sin(t * 0.001 * breathSpeed) + 1) * 0.5;
  const timeHue = (t * 0.00006) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;

    if (tag === 'prismNucleus') {
      const frac = (child.userData.layer as number) / 4;
      const h = child.userData.hue as number;
      tmpCol.setHSL(h, lerp(0.88, 1.0, frac), lerp(0.5, 0.43, frac));
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      const pulse = 1.0 + Math.sin(t * 0.0012 * breathSpeed + frac * 1.8) * 0.07;
      child.scale.setScalar((child.userData.baseR as number) * pulse);
      updateMat(child, rgb, iF * lerp(2.2, 1.35, frac), 1.0);
    } else if (tag === 'prismRing') {
      const hue = ((child.userData.hue as number) + timeHue) % 1.0;
      tmpCol.setHSL(hue, 1.0, 0.6);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      const layer = child.userData.layer as number;
      const bs =
        (0.92 + breath * 0.08) * (1.0 + Math.sin(t * 0.0007 * breathSpeed + layer * 0.9) * 0.03);
      child.scale.setScalar((child.userData.baseR as number) * bs);
      child.rotation.z = t * 0.00009 * breathSpeed * (layer % 2 === 0 ? 1 : -1);
      updateMat(child, rgb, iF, 2.4);
    } else if (tag === 'prismSpoke') {
      const hue = ((child.userData.hue as number) + timeHue) % 1.0;
      tmpCol.setHSL(hue, 1.0, 0.72);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      child.rotation.z = t * 0.00005 * breathSpeed;
      updateMat(child, rgb, iF * 0.7, 1.8);
    }
  }
}

/* ── PRISM3D mode — tilted spectral discs in 3D depth ───────── */

function buildPrism3D(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const facets = Math.max(3, Math.round(cfg.symmetry));
  const rings = Math.max(2, Math.round(cfg.complexity));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();
  const rnd = (n = 1) => (Math.random() - 0.5) * 2 * n;

  // Warm core sphere — dense white-amber point cloud
  const coreCount = Math.max(30, Math.round(lerp(80, 240, iF)));
  const corePos = new Float32Array(coreCount * 3);
  for (let i = 0; i < coreCount; i++) {
    const a = Math.random() * TAU;
    const b = Math.acos(2 * Math.random() - 1);
    const r = R * 0.12 * Math.random() ** 0.35;
    corePos[i * 3] = Math.cos(a) * Math.sin(b) * r;
    corePos[i * 3 + 1] = Math.sin(a) * Math.sin(b) * r;
    corePos[i * 3 + 2] = Math.cos(b) * r;
  }
  const coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
  const corePts = new THREE.Points(
    coreGeo,
    circlePtsMat(hdrColor([255, 176, 86], iF, 2.35), 2.8, 0.72),
  );
  corePts.userData.tag = 'prism3dCore';
  group.add(corePts);

  // Spectral rings tilted and stacked in Z
  for (let ri = 0; ri < rings; ri++) {
    const frac = ri / Math.max(1, rings - 1);
    const hue = SPEC_HUES[ri % SPEC_HUES.length];
    const ringR = R * (0.2 + frac * 0.76);
    const zOff = R * lerp(-0.4, 0.4, frac);
    const tilt = frac * Math.PI * 0.32;
    tmpCol.setHSL(hue, 1.0, 0.58);
    const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];

    const bandHalf = lerp(0.025, 0.2, glowF);
    const arcFrac = lerp(0.52, 0.98, glowF);
    const pCount = Math.max(20, Math.round(lerp(100, 260, iF)));
    const positions: number[] = [];

    for (let i = 0; i < pCount; i++) {
      const rawA = (i / pCount) * TAU + rnd(0.05);
      if (glowF < 0.95) {
        const sectorPos = ((((rawA / TAU) * facets) % 1) + 1) % 1;
        if (sectorPos > arcFrac) continue;
      }
      const r = 1.0 + rnd(bandHalf);
      positions.push(Math.cos(rawA) * r, Math.sin(rawA) * r, 0);
    }

    if (positions.length < 3) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const ptSize = lerp(3.8, 2.2, frac);
    const opacity = lerp(0.82, 0.38, frac);
    const pts = new THREE.Points(geo, circlePtsMat(hdrColor(rgb, iF, 2.8), ptSize, opacity));
    pts.scale.setScalar(ringR);
    pts.position.z = zOff;
    pts.rotation.x = tilt;
    pts.userData.tag = 'prism3dRing';
    pts.userData.hue = hue;
    pts.userData.layer = ri;
    pts.userData.baseR = ringR;
    pts.userData.baseZ = zOff;
    pts.userData.tilt = tilt;
    group.add(pts);
  }

  // Radial diffuse spokes extending out from centre, scattered in Z
  for (let s = 0; s < facets; s++) {
    const ang = (s / facets) * TAU;
    const hue = SPEC_HUES[s % SPEC_HUES.length];
    tmpCol.setHSL(hue, 1.0, 0.68);
    const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
    const pCount = Math.max(10, Math.round(lerp(14, 38, iF)));
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const d = Math.random() ** 0.5 * R * 0.9;
      const spread = d * 0.045;
      pos[i * 3] = Math.cos(ang) * d + rnd(spread);
      pos[i * 3 + 1] = Math.sin(ang) * d + rnd(spread);
      pos[i * 3 + 2] = rnd(R * 0.14);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, circlePtsMat(hdrColor(rgb, iF, 1.8), 2.2, 0.42 * iF));
    pts.userData.tag = 'prism3dSpoke';
    pts.userData.hue = hue;
    pts.userData.ang = ang;
    group.add(pts);
  }

  return group;
}

function updatePrism3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const breath = (Math.sin(t * 0.001 * breathSpeed) + 1) * 0.5;
  const timeHue = (t * 0.00005) % 1.0;
  const tmpCol = new THREE.Color();

  group.rotation.y = t * 0.00022 * breathSpeed;
  group.rotation.x = Math.sin(t * 0.00011 * breathSpeed) * 0.28;

  for (const child of group.children) {
    const tag = child.userData.tag as string;

    if (tag === 'prism3dCore') {
      child.rotation.z = t * 0.00028 * breathSpeed;
      child.rotation.y = t * 0.00018 * breathSpeed;
    } else if (tag === 'prism3dRing') {
      const hue = ((child.userData.hue as number) + timeHue) % 1.0;
      tmpCol.setHSL(hue, 1.0, 0.58);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      const layer = child.userData.layer as number;
      const bs = 0.93 + breath * 0.07;
      child.scale.setScalar((child.userData.baseR as number) * bs);
      child.position.z =
        (child.userData.baseZ as number) + Math.sin(t * 0.0009 * breathSpeed + layer) * R * 0.04;
      child.rotation.z = t * 0.00011 * breathSpeed * (layer % 2 === 0 ? 1 : -1);
      child.rotation.x = (child.userData.tilt as number) + Math.sin(t * 0.0006 + layer) * 0.06;
      updateMat(child, rgb, iF, 2.6);
    } else if (tag === 'prism3dSpoke') {
      const hue = ((child.userData.hue as number) + timeHue * 0.6) % 1.0;
      tmpCol.setHSL(hue, 1.0, 0.68);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      child.rotation.z = t * 0.00006 * breathSpeed;
      updateMat(child, rgb, iF * 0.55, 1.8);
    }
  }
}

/* ── LIQUID mode — iridescent oil-film rainbow bands ─────────── */

function buildLiquid(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const sym = Math.max(1, Math.round(cfg.symmetry));
  const bandCount = Math.max(2, Math.round(cfg.complexity));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  for (let b = 0; b < bandCount; b++) {
    const frac = b / Math.max(1, bandCount - 1);
    const hue = frac;
    const bandR = R * (0.06 + frac * 0.9);
    tmpCol.setHSL(hue, 1.0, 0.62);
    const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
    const bandW = lerp(0.03, 0.22, glowF);
    const pCount = Math.max(60, Math.round(lerp(100, 280, iF)));
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const a = (i / pCount) * TAU;
      const ripple = Math.sin(a * sym + b * 0.85) * 0.08;
      const r = 1.0 + ripple + (Math.random() - 0.5) * bandW;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ptSize = lerp(3.8, 2.0, frac);
    const opacity = lerp(0.85, 0.46, frac);
    const pts = new THREE.Points(geo, ptsMat(hdrColor(rgb, iF, 3.0), ptSize, opacity));
    pts.scale.setScalar(bandR);
    pts.userData.tag = 'liquidBand';
    pts.userData.hue = hue;
    pts.userData.layer = b;
    pts.userData.baseR = bandR;
    group.add(pts);
  }

  // Bright central pearl core
  const nCount = Math.max(20, Math.round(90 * iF));
  const nPos = new Float32Array(nCount * 3);
  for (let i = 0; i < nCount; i++) {
    const a = Math.random() * TAU;
    const r = Math.random() * R * 0.055;
    nPos[i * 3] = Math.cos(a) * r;
    nPos[i * 3 + 1] = Math.sin(a) * r;
  }
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  const core = new THREE.Points(nGeo, ptsMat(hdrColor([255, 250, 240], iF, 4.5), 3.2, 0.94));
  core.userData.tag = 'liquidCore';
  group.add(core);

  return group;
}

function updateLiquid(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const breath = (Math.sin(t * 0.001 * breathSpeed) + 1) * 0.5;
  const timeHue = (t * 0.0001) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'liquidBand') {
      const layer = child.userData.layer as number;
      const hue = ((child.userData.hue as number) + timeHue + layer * 0.04) % 1.0;
      tmpCol.setHSL(hue, 1.0, 0.62);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      const pulse = 1.0 + Math.sin(t * 0.0009 * breathSpeed + layer * 0.7) * 0.05;
      child.scale.setScalar((child.userData.baseR as number) * pulse);
      child.rotation.z = t * 0.00007 * breathSpeed * (layer % 2 === 0 ? 1 : -1);
      updateMat(child, rgb, iF, 2.8);
    } else if (tag === 'liquidCore') {
      const h = (timeHue * 0.4) % 1.0;
      tmpCol.setHSL(h, 0.22, 0.97);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      child.scale.setScalar(1.0 + breath * 0.1);
      updateMat(child, rgb, iF * 1.6, 2.5);
    }
  }
}

/* ── CELLS mode — bioluminescent tissue / petri dish ─────────── */

function buildCells(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const N = Math.max(3, Math.round(cfg.complexity * 1.4) + 1);
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();
  const phi = 2.399963;

  for (let ci = 0; ci < N; ci++) {
    const frac = ci / N;
    const ang = ci * phi;
    const r = Math.sqrt((ci + 0.5) / N) * R * 0.8;
    const cx = Math.cos(ang) * r;
    const cy = Math.sin(ang) * r;
    const hue = (frac + 0.32) % 1.0;
    const phase = Math.random() * TAU;

    const nucR = R * lerp(0.022, 0.055, iF);
    const nucCount = Math.max(8, Math.round(22 * iF));
    const nucPos = new Float32Array(nucCount * 3);
    for (let i = 0; i < nucCount; i++) {
      const a = Math.random() * TAU;
      const nr = Math.random() * nucR;
      nucPos[i * 3] = Math.cos(a) * nr;
      nucPos[i * 3 + 1] = Math.sin(a) * nr;
    }
    tmpCol.setHSL(hue, 0.6, 0.88);
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute('position', new THREE.BufferAttribute(nucPos, 3));
    const nPts = new THREE.Points(
      nGeo,
      ptsMat(hdrColor([tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255], iF, 3.8), 2.8, 0.92),
    );
    nPts.position.set(cx, cy, 0);
    nPts.userData.tag = 'cellNucleus';
    nPts.userData.hue = hue;
    nPts.userData.phase = phase;
    group.add(nPts);

    const haloR = R * (lerp(0.06, 0.16, glowF) + 0.02);
    const haloCount = Math.max(30, Math.round(lerp(60, 150, iF)));
    const haloPos = new Float32Array(haloCount * 3);
    for (let i = 0; i < haloCount; i++) {
      const a = (i / haloCount) * TAU + (Math.random() - 0.5) * 0.18;
      const hr = haloR * (1.0 + (Math.random() - 0.5) * 0.28);
      haloPos[i * 3] = Math.cos(a) * hr;
      haloPos[i * 3 + 1] = Math.sin(a) * hr;
    }
    tmpCol.setHSL(hue, 0.9, 0.55);
    const hGeo = new THREE.BufferGeometry();
    hGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    const hPts = new THREE.Points(
      hGeo,
      ptsMat(hdrColor([tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255], iF, 2.2), 2.0, 0.55),
    );
    hPts.position.set(cx, cy, 0);
    hPts.userData.tag = 'cellHalo';
    hPts.userData.hue = hue;
    hPts.userData.phase = phase + 0.9;
    group.add(hPts);
  }

  return group;
}

function updateCells(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const timeHue = (t * 0.00003) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    const hue = ((child.userData.hue as number) + timeHue * 0.4) % 1.0;
    const phase = child.userData.phase as number;

    if (tag === 'cellNucleus') {
      tmpCol.setHSL(hue, 0.6, 0.88);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      child.scale.setScalar(1.0 + Math.sin(t * 0.0009 * breathSpeed + phase) * 0.09);
      updateMat(child, rgb, iF * 1.9, 2.5);
    } else if (tag === 'cellHalo') {
      tmpCol.setHSL(hue, 0.9, 0.55);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      child.scale.setScalar(0.93 + Math.sin(t * 0.0006 * breathSpeed + phase) * 0.07);
      updateMat(child, rgb, iF, 2.0);
    }
  }
}

/* ── CURRENT mode — flowing particle currents (curl field) ───── */

function buildCurrent(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const count = Math.max(400, Math.round(lerp(800, 2500, iF)));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const r = Math.sqrt(Math.random()) * R * 0.9;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);

  tmpCol.setHSL(lerp(0.58, 0.33, glowF), 1.0, 0.58);
  const pts = new THREE.Points(
    geo,
    ptsMat(hdrColor([tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255], iF, 2.6), 1.7, 0.72),
  );
  pts.userData.tag = 'currentField';
  pts.userData.count = count;
  pts.userData.prevT = -1;
  group.add(pts);

  return group;
}

function updateCurrent(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed * 0.7;
  const freq = (Math.max(1, Math.round(cfg.symmetry)) * Math.PI) / Math.max(R, 1);
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const baseRgb = pal.rgb;
  const R2 = R * R * 0.88;

  for (const child of group.children) {
    if ((child.userData.tag as string) !== 'currentField') continue;
    const pts = child as THREE.Points;
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const count = child.userData.count as number;
    const prevT = child.userData.prevT as number;
    const dt = prevT < 0 ? 16 : Math.min(t - prevT, 32);
    child.userData.prevT = t;
    const amplitude = R * 0.014 * speed * (dt / 16);
    const tSlow = t * 0.0005 * speed;

    for (let i = 0; i < count; i++) {
      const x = arr[i * 3];
      const y = arr[i * 3 + 1];
      // Divergence-free curl of stream function ψ = sin(x·f)·sin(y·f + tSlow)
      const vx = Math.sin(x * freq) * Math.cos(y * freq + tSlow) * amplitude;
      const vy = -Math.cos(x * freq) * Math.sin(y * freq + tSlow) * amplitude;
      let nx = x + vx;
      let ny = y + vy;
      if (nx * nx + ny * ny > R2) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random() * 0.5) * R * 0.55;
        nx = Math.cos(a) * r;
        ny = Math.sin(a) * r;
      }
      // Finger distortion: repel particles from pointer
      if (_distortActive) {
        const f = fingerForce(nx, ny, 0, R * 0.55);
        nx += f.x * (0.7 + speed);
        ny += f.y * (0.7 + speed);
      }
      arr[i * 3] = nx;
      arr[i * 3 + 1] = ny;
    }
    posAttr.needsUpdate = true;

    const rgb: [number, number, number] = [
      lerp(baseRgb[0], 255, glowF * 0.12),
      lerp(baseRgb[1], 255, glowF * 0.12),
      lerp(baseRgb[2], 255, glowF * 0.12),
    ];
    updateMat(child, rgb, iF, 2.2);
  }
}

/* ── PLASMA mode — solar filaments with central attractor ────── */

function isCurrentTextureMode(mode: Mode): boolean {
  return (
    mode === 'current' ||
    mode === 'currentscales' ||
    mode === 'cyclonetiles' ||
    mode === 'eddylace' ||
    mode === 'magneticsand' ||
    mode === 'gravity' ||
    mode === 'fire'
  );
}

function buildCurrentTexture(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const count = Math.max(900, Math.round(lerp(1800, 4600, iF)));
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const positions = new Float32Array(count * 3);
  const density = cfg.complexity / 10;
  const cell = lerp(R * 0.34, R * 0.13, density);

  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    if (cfg.mode === 'currentscales') {
      const cols = Math.max(5, Math.ceil((R * 2.2) / cell));
      const row = Math.floor(Math.random() * cols);
      const col = Math.floor(Math.random() * cols);
      const offset = row % 2 === 0 ? 0 : cell * 0.5;
      const cx = (col - cols / 2) * cell + offset;
      const cy = (row - cols / 2) * cell * 0.58;
      const a = Math.PI + Math.random() * Math.PI;
      const r = cell * (0.14 + Math.random() * 0.48);
      x = cx + Math.cos(a) * r;
      y = cy + Math.sin(a) * r * 0.55;
    } else if (cfg.mode === 'cyclonetiles') {
      const cols = Math.max(5, Math.ceil((R * 2.15) / cell));
      const col = Math.floor(Math.random() * cols);
      const row = Math.floor(Math.random() * cols);
      const cx = (col - cols / 2) * cell;
      const cy = (row - cols / 2) * cell;
      const turn = Math.random() * TAU * 1.8;
      const r = cell * Math.sqrt(Math.random()) * 0.42;
      x = cx + Math.cos(turn) * r;
      y = cy + Math.sin(turn) * r;
    } else if (cfg.mode === 'eddylace') {
      const clusters = Math.max(5, Math.round(cfg.symmetry + cfg.complexity));
      const k = i % clusters;
      const centerA = (k / clusters) * TAU + Math.sin(k * 12.989) * 0.2;
      const centerR = R * (0.18 + ((k * 0.618) % 1) * 0.72);
      const cx = Math.cos(centerA) * centerR;
      const cy = Math.sin(centerA) * centerR * 0.72;
      const a = Math.random() * TAU;
      const r = cell * (0.08 + Math.random() * 0.72);
      x = cx + Math.cos(a + r * 0.035) * r;
      y = cy + Math.sin(a + r * 0.035) * r * 0.62;
    } else if (cfg.mode === 'eclipse') {
      const a = Math.random() * TAU;
      const hollow = R * (0.22 + cfg.glow * 0.012);
      const outer = R * (0.92 + Math.random() * 0.24);
      const radial = hollow + (outer - hollow) * Math.sqrt(Math.random());
      const ray = Math.sin(a * cfg.symmetry) * R * 0.028;
      x = Math.cos(a) * (radial + ray);
      y = Math.sin(a) * (radial + ray) * 0.82;
    } else if (cfg.mode === 'gravity') {
      const side = i % 2 === 0 ? 1 : -1;
      const coreX = side * R * 0.32;
      const coreY = -side * R * 0.06;
      const a = Math.random() * TAU;
      const hollow = R * (0.12 + cfg.glow * 0.008);
      const outer = R * (0.24 + Math.random() * 0.28);
      const radial = hollow + (outer - hollow) * Math.sqrt(Math.random());
      x = coreX + Math.cos(a) * radial;
      y = coreY + Math.sin(a) * radial;
    } else if (cfg.mode === 'fire') {
      const p = Math.random();
      const yNorm = p * 2 - 1;
      const taper = Math.max(0.05, 1 - ((yNorm + 1) / 2) ** 1.7);
      const wave = Math.sin(yNorm * 7.2 + Math.random() * TAU) * R * 0.08 * taper;
      const width = R * (0.1 + 0.46 * taper);
      x = (Math.random() - 0.5) * width + wave;
      y = yNorm * R * 0.88;
    } else {
      const lane = (Math.random() - 0.5) * R * 1.9;
      const wave = Math.sin(lane * 0.012) * R * 0.28;
      x = lane;
      y = wave + (Math.random() - 0.5) * R * 0.22;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * R * 0.08;
  }

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);

  const isNewSandMode = cfg.mode === 'eclipse' || cfg.mode === 'gravity' || cfg.mode === 'fire';
  const pointSize =
    cfg.mode === 'fire' ? 2.8 : cfg.mode === 'eclipse' || cfg.mode === 'gravity' ? 2.25 : 1.55;
  const pointOpacity = isNewSandMode ? 0.86 : 0.7;
  const pts = new THREE.Points(
    geo,
    circlePtsMat(hdrColor([rr, gg, bb], iF, isNewSandMode ? 3.1 : 2.45), pointSize, pointOpacity),
  );
  pts.userData.tag = 'currentTexture';
  pts.userData.count = count;
  pts.userData.prevT = -1;
  group.add(pts);

  if (cfg.mode === 'eclipse') {
    const hollow = R * (0.24 + cfg.glow * 0.01);
    const outer = R * 0.92;
    const coronaCount = Math.max(900, Math.round(lerp(1300, 2600, iF)));
    const coronaPositions = new Float32Array(coronaCount * 3);
    for (let i = 0; i < coronaCount; i++) {
      const a = (i / coronaCount) * Math.PI * 2 + Math.random() * 0.018;
      const band = Math.random();
      const r = hollow + (outer - hollow) * (0.18 + band ** 0.58 * 0.82);
      const flare = Math.sin(a * cfg.symmetry) * R * 0.025;
      coronaPositions[i * 3] = Math.cos(a) * (r + flare);
      coronaPositions[i * 3 + 1] = Math.sin(a) * (r + flare) * 0.82;
      coronaPositions[i * 3 + 2] = 0.06;
    }
    const coronaGeo = new THREE.BufferGeometry();
    coronaGeo.setAttribute('position', new THREE.BufferAttribute(coronaPositions, 3));
    const corona = new THREE.Points(
      coronaGeo,
      circlePtsMat(hdrColor([rr, gg, bb], iF, 3.4), 2.9, 0.9),
    );
    corona.userData.tag = 'eclipseCorona';
    corona.userData.base = coronaPositions.slice();
    corona.userData.count = coronaCount;
    group.add(corona);
    for (const [radius, opacity] of [
      [hollow, 0.64],
      [outer, 0.18],
    ] as const) {
      const ring = new THREE.Line(
        circleGeo(160),
        lineMat(hdrColor([rr, gg, bb], iF, 2.7), opacity),
      );
      ring.scale.set(radius, radius * 0.82, 1);
      ring.userData.tag = 'currentTextureAnchor';
      ring.userData.baseScale = [radius, radius * 0.82];
      group.add(ring);
    }
  } else if (cfg.mode === 'gravity') {
    for (const side of [1, -1]) {
      const coreX = side * R * 0.32;
      const coreY = -side * R * 0.06;
      const hollow = R * (0.13 + cfg.glow * 0.008);
      const ring = new THREE.Line(circleGeo(128), lineMat(hdrColor([rr, gg, bb], iF, 2.8), 0.5));
      ring.position.set(coreX, coreY, 0.02);
      ring.scale.setScalar(hollow);
      ring.userData.tag = 'currentTextureAnchor';
      ring.userData.baseScale = [hollow, hollow];
      group.add(ring);
    }
  } else if (cfg.mode === 'fire') {
    const spineGeo = new THREE.BufferGeometry();
    const spine = new Float32Array(28 * 3);
    for (let i = 0; i < 28; i++) {
      const p = i / 27;
      const y = lerp(-R * 0.92, R * 0.88, p);
      const x = Math.sin(p * Math.PI * 3.2) * R * 0.055 * (1 - p * 0.65);
      spine[i * 3] = x;
      spine[i * 3 + 1] = y;
      spine[i * 3 + 2] = 0.04;
    }
    spineGeo.setAttribute('position', new THREE.BufferAttribute(spine, 3));
    const flameLine = new THREE.Line(spineGeo, lineMat(hdrColor([rr, gg, bb], iF, 3.2), 0.42));
    flameLine.userData.tag = 'fireSpine';
    group.add(flameLine);
  }

  if (cfg.mode === 'currentscales') {
    const pulseCount = Math.max(420, Math.round(lerp(700, 1500, iF)));
    const pulsePositions = new Float32Array(pulseCount * 3);
    const cols = Math.max(5, Math.ceil((R * 2.2) / cell));
    for (let i = 0; i < pulseCount; i++) {
      const row = Math.floor(i / cols) % cols;
      const col = i % cols;
      const offset = row % 2 === 0 ? 0 : cell * 0.5;
      const cx = (col - cols / 2) * cell + offset;
      const cy = (row - cols / 2) * cell * 0.58;
      const a = Math.PI + ((i * 0.61803398875) % 1) * Math.PI;
      const r = cell * (0.2 + (((i * 17) % 100) / 100) * 0.42);
      pulsePositions[i * 3] = cx + Math.cos(a) * r;
      pulsePositions[i * 3 + 1] = cy + Math.sin(a) * r * 0.55;
      pulsePositions[i * 3 + 2] = R * 0.012;
    }
    const pulseGeo = new THREE.BufferGeometry();
    const pulseAttr = new THREE.BufferAttribute(pulsePositions, 3);
    pulseAttr.setUsage(THREE.DynamicDrawUsage);
    pulseGeo.setAttribute('position', pulseAttr);
    const pulsePts = new THREE.Points(
      pulseGeo,
      circlePtsMat(hdrColor([rr, gg, bb], iF, 2.7), 2.2, 0.18),
    );
    pulsePts.userData.tag = 'currentScalePulse';
    pulsePts.userData.count = pulseCount;
    pulsePts.userData.base = pulsePositions.slice();
    group.add(pulsePts);
  }

  return group;
}

function currentTextureVector(
  mode: Mode,
  x: number,
  y: number,
  tSlow: number,
  R: number,
  cfg: Cfg,
): { x: number; y: number } {
  const density = cfg.complexity / 10;
  const sym = Math.max(2, Math.round(cfg.symmetry));
  const cell = lerp(R * 0.32, R * 0.12, density);

  if (mode === 'currentscales') {
    const row = Math.floor((y + R * 1.2) / (cell * 0.58));
    const offset = row % 2 === 0 ? 0 : cell * 0.5;
    const cx = Math.round((x + offset) / cell) * cell - offset;
    const cy = row * cell * 0.58 - R * 1.2 + cell * 0.3;
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy) + 1;
    const scaleLip = Math.sin((d / cell) * Math.PI);
    return {
      x: (-dy / d) * scaleLip + Math.sin(y * 0.012 + tSlow) * 0.26,
      y: (dx / d) * scaleLip * 0.55 + Math.cos((x + cx) * 0.01 + tSlow) * 0.18,
    };
  }

  if (mode === 'cyclonetiles') {
    const cx = Math.round(x / cell) * cell;
    const cy = Math.round(y / cell) * cell;
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy) + 1;
    const dir = (Math.round(cx / cell) + Math.round(cy / cell)) % 2 === 0 ? 1 : -1;
    const spin = Math.max(0.15, 1 - d / (cell * 0.82));
    return {
      x: (-dy / d) * spin * dir + Math.sin(y * 0.008 + tSlow * 0.6) * 0.18,
      y: (dx / d) * spin * dir + Math.cos(x * 0.008 - tSlow * 0.6) * 0.18,
    };
  }

  if (mode === 'eddylace') {
    const f = sym / Math.max(R, 1);
    return {
      x: Math.sin(y * f * 2.4 + tSlow) * 0.55 + Math.sin((x + y) * f * 1.1 - tSlow * 0.7) * 0.35,
      y:
        -Math.sin(x * f * 2.2 - tSlow * 0.8) * 0.55 +
        Math.cos((x - y) * f * 1.3 + tSlow * 0.6) * 0.35,
    };
  }

  if (mode === 'eclipse') {
    const r = Math.sqrt(x * x + y * y) + 1;
    const a = Math.atan2(y, x);
    const hollow = R * (0.21 + cfg.glow * 0.012);
    const rim = Math.max(0, 1 - Math.abs(r - hollow) / Math.max(R * 0.12, 1));
    const spoke = Math.sin(a * sym + tSlow * 0.45) * 0.16;
    const out = 0.78 + rim * 0.65 + spoke;
    return {
      x: Math.cos(a) * out + Math.cos(a + Math.PI / 2) * spoke * 0.28,
      y: Math.sin(a) * out * 0.82 + Math.sin(a + Math.PI / 2) * spoke * 0.22,
    };
  }

  if (mode === 'gravity') {
    const coreA = { x: R * 0.32, y: -R * 0.06 };
    const coreB = { x: -R * 0.32, y: R * 0.06 };
    const da = Math.hypot(x - coreA.x, y - coreA.y);
    const db = Math.hypot(x - coreB.x, y - coreB.y);
    const core = da <= db ? coreA : coreB;
    const dx = x - core.x;
    const dy = y - core.y;
    const d = Math.sqrt(dx * dx + dy * dy) + 1;
    const swirlDir = core === coreA ? 1 : -1;
    const pull =
      core === coreA ? { x: coreB.x - x, y: coreB.y - y } : { x: coreA.x - x, y: coreA.y - y };
    const pd = Math.hypot(pull.x, pull.y) + 1;
    const orbit = 0.78 + Math.sin(tSlow * 0.5 + d * 0.014) * 0.1;
    return {
      x: (-dy / d) * orbit * swirlDir + (pull.x / pd) * 0.16,
      y: (dx / d) * orbit * swirlDir + (pull.y / pd) * 0.16,
    };
  }

  if (mode === 'fire') {
    const top = R * 0.92;
    const y01 = Math.min(1, Math.max(0, (y + top) / (top * 2)));
    const taper = Math.max(0.08, 1 - y01 ** 1.65);
    const curl = Math.sin(y * 0.018 + tSlow * 1.8) * 0.52 * taper;
    const centerPull = (-x / Math.max(R, 1)) * (0.38 + y01 * 0.42);
    const lift = 0.82 + y01 * 0.45 + Math.sin(x * 0.018 - tSlow) * 0.12;
    return {
      x: curl + centerPull,
      y: lift,
    };
  }

  const poleA = { x: Math.cos(tSlow * 0.12) * R * 0.34, y: Math.sin(tSlow * 0.09) * R * 0.18 };
  const poleB = { x: -poleA.x, y: -poleA.y };
  const ax = x - poleA.x;
  const ay = y - poleA.y;
  const bx = x - poleB.x;
  const by = y - poleB.y;
  const a2 = ax * ax + ay * ay + R * 9;
  const b2 = bx * bx + by * by + R * 9;
  const fx = ax / a2 - bx / b2;
  const fy = ay / a2 - by / b2;
  const angle = Math.atan2(fy, fx) + Math.PI / 2;
  return {
    x: Math.cos(angle) * 0.85 + Math.sin(y * 0.015 + tSlow) * 0.15,
    y: Math.sin(angle) * 0.85 + Math.cos(x * 0.015 - tSlow) * 0.15,
  };
}

function updateCurrentTexture(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed * 0.72;
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const baseRgb = pal.rgb;
  const fieldR = R * 1.12;
  const R2 = fieldR * fieldR;
  const currentScaleMusicMode = cfg.mode === 'currentscales';
  const beatPhase = (t / 1000) * Math.PI * 2 * (_musicBpm / 60);
  const scaleDensity = cfg.complexity / 10;
  const scaleCell = lerp(R * 0.32, R * 0.12, scaleDensity);
  if (currentScaleMusicMode) {
    _musicPulse *= 0.94;
    _musicBass *= 0.965;
    _musicDrums *= 0.9;
    _musicPads *= 0.985;
    _musicKeys *= 0.975;
    _musicLead *= 0.92;
  }
  const internalPulse = currentScaleMusicMode ? ((Math.sin(beatPhase) + 1) / 2) ** 3 * 0.24 : 0;
  const musicPulse = currentScaleMusicMode
    ? Math.min(1, internalPulse + _musicPulse * 0.95 + _musicBass * 0.42 + _musicDrums * 0.28)
    : 0;
  const bassPush = currentScaleMusicMode ? Math.min(1, _musicBass * 0.9 + internalPulse * 0.28) : 0;
  const flowLift = currentScaleMusicMode
    ? Math.min(1, _musicPads * 0.55 + _musicKeys * 0.35 + internalPulse * 0.18)
    : 0;
  const leadFlicker = currentScaleMusicMode ? Math.min(1, _musicLead + _musicDrums * 0.25) : 0;
  const colourShift = currentScaleMusicMode
    ? Math.min(1, (musicPulse * 0.38 + leadFlicker * 0.5 + flowLift * 0.22) * _currentScaleColour)
    : 0;
  const pulseRgb: [number, number, number] = [
    lerp(baseRgb[0], 255, glowF * 0.12 + colourShift * 0.42),
    lerp(baseRgb[1], 230, glowF * 0.1 + colourShift * 0.22),
    lerp(baseRgb[2], 190, glowF * 0.08 + colourShift * 0.12),
  ];

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'currentScalePulse') {
      const pts = child as THREE.Points;
      const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const base = child.userData.base as Float32Array;
      const count = child.userData.count as number;
      const cellBeat = musicPulse * _currentScalePulse;
      const cellBass = bassPush * _currentScaleBass;
      const cellFlow = flowLift * _currentScaleFlow;
      const geometryWarp =
        _currentScaleGeometry * (cellBeat * 0.55 + cellBass * 0.65 + cellFlow * 0.35);
      const wingOpen = _currentScaleWings * (cellBeat * 0.52 + cellBass * 0.32 + cellFlow * 0.26);
      for (let i = 0; i < count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const row = Math.floor((y + R * 1.2) / (scaleCell * 0.58));
        const offset = row % 2 === 0 ? 0 : scaleCell * 0.5;
        const cx = Math.round((x + offset) / scaleCell) * scaleCell - offset;
        const cy = row * scaleCell * 0.58 - R * 1.2 + scaleCell * 0.3;
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) + 1;
        const lane = ((i * 0.61803398875) % 1) * Math.PI * 2;
        const ripple = 0.5 + Math.sin(beatPhase - d * 0.045 + lane) * 0.5;
        const expand = 1 + cellBeat * 0.2 + cellBass * ripple * 0.28 + geometryWarp * 0.16;
        const ellipse = 1 + Math.sin(beatPhase + row * 0.8) * geometryWarp * 0.08;
        const swirl =
          cellFlow *
          Math.sin(beatPhase * 0.5 + lane) *
          scaleCell *
          0.08 *
          (1 + _currentScaleGeometry);
        const yNorm = Math.min(1, Math.abs((cy + dy) / Math.max(R * 0.78, 1)));
        const wingEnvelope = Math.max(0, 1 - (yNorm - 0.38) * (yNorm - 0.38) * 3.4);
        const side = cx + dx >= 0 ? 1 : -1;
        const wingX = side * R * 0.18 * wingOpen * wingEnvelope;
        const wingY = Math.sin(beatPhase * 0.5 + yNorm * 4 + lane) * R * 0.026 * wingOpen;
        const shaped = currentScaleShapeTransform(
          cx + dx * expand + (-dy / d) * swirl + wingX,
          cy + dy * expand * ellipse + (dx / d) * swirl * 0.62 + wingY,
          R,
          Math.min(1, _currentScaleGeometry * 0.74 + wingOpen * 0.2),
          beatPhase,
        );
        arr[i * 3] = shaped.x;
        arr[i * 3 + 1] = shaped.y;
        arr[i * 3 + 2] = base[i * 3 + 2] + (ripple * cellBass + leadFlicker * 0.35) * R * 0.012;
      }
      posAttr.needsUpdate = true;
      updateMat(pts, pulseRgb, iF, 2.5 + cellBeat * 1.4 + leadFlicker * 0.8);
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = 1.55 + cellBeat * 2.4 + cellBass * 1.1 + leadFlicker * 0.8;
      mat.opacity = 0.16 + cellBeat * 0.24 + cellBass * 0.18 + leadFlicker * 0.16;
      continue;
    }
    if (tag !== 'currentTexture') continue;
    const pts = child as THREE.Points;
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const count = child.userData.count as number;
    const prevT = child.userData.prevT as number;
    const dt = prevT < 0 ? 16 : Math.min(t - prevT, 32);
    child.userData.prevT = t;
    const step =
      R *
      0.012 *
      speed *
      (dt / 16) *
      (1 + musicPulse * 0.42 * _currentScalePulse + flowLift * 0.36 * _currentScaleFlow);
    const tSlow = t * 0.00055 * speed;

    for (let i = 0; i < count; i++) {
      const x = arr[i * 3];
      const y = arr[i * 3 + 1];
      const z = arr[i * 3 + 2];
      const v = currentTextureVector(
        cfg.mode,
        x,
        y,
        tSlow + flowLift * _currentScaleFlow * 0.35,
        R,
        cfg,
      );
      let nx = x + v.x * step * (1 + bassPush * _currentScaleBass * 0.18);
      let ny = y + v.y * step * (1 + bassPush * _currentScaleBass * 0.18);
      let nz = z + Math.sin((x + y) * 0.006 + tSlow) * step * 0.08;

      if (currentScaleMusicMode && musicPulse > 0.01) {
        const row = Math.floor((ny + R * 1.2) / (scaleCell * 0.58));
        const offset = row % 2 === 0 ? 0 : scaleCell * 0.5;
        const cx = Math.round((nx + offset) / scaleCell) * scaleCell - offset;
        const cy = row * scaleCell * 0.58 - R * 1.2 + scaleCell * 0.3;
        const dx = nx - cx;
        const dy = ny - cy;
        const d = Math.sqrt(dx * dx + dy * dy) + 1;
        const localBeat = 0.5 + Math.sin(beatPhase - d * 0.05 + row * 0.7) * 0.5;
        const geo = _currentScaleGeometry * (0.55 + localBeat * 0.45);
        const push =
          R * 0.0024 * localBeat * (musicPulse * _currentScalePulse + bassPush * _currentScaleBass);
        const swirl = R * 0.0018 * flowLift * _currentScaleFlow * (1 + geo);
        const shear = Math.sin(beatPhase + row * 0.9) * R * 0.0009 * geo;
        const yNorm = Math.min(1, Math.abs(ny / Math.max(R * 0.78, 1)));
        const wingEnvelope = Math.max(0, 1 - (yNorm - 0.38) * (yNorm - 0.38) * 3.4);
        const wingOpen =
          _currentScaleWings * (musicPulse * 0.38 + bassPush * 0.24 + flowLift * 0.18);
        const wingX = (nx >= 0 ? 1 : -1) * R * 0.0018 * wingEnvelope * wingOpen;
        nx += (dx / d) * push + (-dy / d) * swirl + shear + wingX;
        ny += (dy / d) * push + (dx / d) * swirl * 0.6 - shear * 0.45;
        nz += (localBeat * bassPush * _currentScaleBass + leadFlicker * 0.4) * R * 0.0012;
      }

      if (currentScaleMusicMode) {
        const shaped = currentScaleShapeTransform(
          nx,
          ny,
          R,
          Math.min(1, _currentScaleGeometry * 0.58 + musicPulse * _currentScalePulse * 0.18),
          beatPhase,
        );
        nx = shaped.x;
        ny = shaped.y;
      }

      if (_distortActive) {
        const f = fingerForce(nx, ny, nz, R * 0.62);
        nx += f.x * (0.95 + speed * 1.1);
        ny += f.y * (0.95 + speed * 1.1);
        nz += f.z * 0.5;
      }

      const minR = cfg.mode === 'eclipse' ? R * (0.24 + cfg.glow * 0.01) : 0;
      const fireTop = R * 0.98;
      const fireTaper = Math.max(0.05, 1 - ((ny + fireTop) / (fireTop * 2)) ** 1.7);
      const outsideFire =
        cfg.mode === 'fire' &&
        (ny > fireTop ||
          ny < -fireTop ||
          Math.abs(nx) > R * (0.14 + 0.5 * fireTaper) ||
          Math.random() < 0.002);
      const r2 = nx * nx + ny * ny;
      const gravityCoreA = { x: R * 0.32, y: -R * 0.06 };
      const gravityCoreB = { x: -R * 0.32, y: R * 0.06 };
      const gravityHollow = R * (0.13 + cfg.glow * 0.008);
      const tooCloseToGravityCore =
        cfg.mode === 'gravity' &&
        (Math.hypot(nx - gravityCoreA.x, ny - gravityCoreA.y) < gravityHollow ||
          Math.hypot(nx - gravityCoreB.x, ny - gravityCoreB.y) < gravityHollow);
      if (r2 > R2 || r2 < minR * minR || tooCloseToGravityCore || outsideFire) {
        const a =
          cfg.mode === 'eclipse'
            ? Math.atan2(ny, nx) + (Math.random() - 0.5) * 0.42
            : cfg.mode === 'gravity'
              ? Math.random() * Math.PI * 2
              : Math.atan2(ny, nx) + Math.PI + (Math.random() - 0.5) * 0.9;
        const gravityCore =
          cfg.mode === 'gravity' ? (Math.random() > 0.5 ? gravityCoreA : gravityCoreB) : null;
        const r =
          cfg.mode === 'eclipse'
            ? minR + (fieldR - minR) * (0.22 + Math.random() * 0.62)
            : cfg.mode === 'gravity'
              ? gravityHollow + R * (0.08 + Math.random() * 0.36)
              : fieldR * (0.18 + Math.random() * 0.58);
        if (cfg.mode === 'fire') {
          const yNorm = -0.98 + Math.random() * 0.24;
          const taper = Math.max(0.05, 1 - ((yNorm + 1) / 2) ** 1.7);
          nx = (Math.random() - 0.5) * R * (0.16 + 0.44 * taper);
          ny = yNorm * R;
        } else {
          nx = (gravityCore?.x ?? 0) + Math.cos(a) * r;
          ny = (gravityCore?.y ?? 0) + Math.sin(a) * r * (cfg.mode === 'eclipse' ? 0.82 : 1);
        }
        nz = (Math.random() - 0.5) * R * 0.08;
      }

      arr[i * 3] = nx;
      arr[i * 3 + 1] = ny;
      arr[i * 3 + 2] = nz;
    }
    posAttr.needsUpdate = true;

    const rgb: [number, number, number] = currentScaleMusicMode
      ? pulseRgb
      : [
          lerp(baseRgb[0], 255, glowF * 0.12),
          lerp(baseRgb[1], 255, glowF * 0.12),
          lerp(baseRgb[2], 255, glowF * 0.12),
        ];
    const isNewSandMode = cfg.mode === 'eclipse' || cfg.mode === 'gravity' || cfg.mode === 'fire';
    updateMat(child, rgb, iF, isNewSandMode ? 3.1 : 2.3);
    const mat = pts.material as THREE.PointsMaterial;
    if (currentScaleMusicMode) {
      mat.size =
        1.45 + musicPulse * 0.95 * _currentScalePulse + bassPush * 0.65 * _currentScaleBass;
      mat.opacity = 0.62 + musicPulse * 0.2 * _currentScalePulse + leadFlicker * 0.1;
    } else if (isNewSandMode) {
      mat.size = cfg.mode === 'fire' ? 2.6 + glowF * 0.8 : 2.05 + glowF * 0.55;
      mat.opacity = 0.78 + glowF * 0.12;
    }
  }

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'currentTextureAnchor') {
      const [sx, sy] = child.userData.baseScale as [number, number];
      const pulse = 1 + Math.sin(t * 0.0011 * speed) * 0.025;
      child.scale.set(sx * pulse, sy * pulse, 1);
      updateMat(child, baseRgb, iF, 2.55);
    } else if (tag === 'eclipseCorona') {
      const pts = child as THREE.Points;
      const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const base = child.userData.base as Float32Array;
      const count = child.userData.count as number;
      const spin = t * 0.00003 * speed;
      const wobble = Math.sin(t * 0.001 * speed) * 0.018;
      for (let i = 0; i < count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const a = Math.atan2(y, x) + spin;
        const r = Math.hypot(x, y) * (1 + wobble * Math.sin(a * cfg.symmetry));
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = Math.sin(a) * r * 0.82;
      }
      posAttr.needsUpdate = true;
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = 2.5 + glowF * 0.85;
      mat.opacity = 0.82 + glowF * 0.12;
      updateMat(child, baseRgb, iF, 3.4);
    } else if (tag === 'fireSpine') {
      const pulse = 1 + Math.sin(t * 0.0018 * speed) * 0.035;
      child.scale.set(pulse, 1, 1);
      updateMat(child, baseRgb, iF, 3.2);
    }
  }
}

function currentScaleShapeTransform(
  x: number,
  y: number,
  R: number,
  amount: number,
  beatPhase: number,
): { x: number; y: number } {
  if (_currentScaleShape === 'scales' || amount <= 0.001) return { x, y };
  const r = Math.sqrt(x * x + y * y) + 1;
  const a = Math.atan2(y, x);
  let tx = x;
  let ty = y;

  if (_currentScaleShape === 'rings') {
    const ringIndex = Math.round((r / Math.max(R * 0.18, 1)) % 3);
    const ringRadius = R * (0.2 + ringIndex * 0.18);
    const wobble = Math.sin(a * 3 + beatPhase) * R * 0.018;
    tx = Math.cos(a) * (ringRadius + wobble);
    ty = Math.sin(a) * (ringRadius + wobble) * (0.86 + ringIndex * 0.04);
  } else if (_currentScaleShape === 'brain') {
    const fold = Math.sin(a * 6 + beatPhase * 0.45) * R * 0.045;
    const split =
      Math.sign(x || 1) * R * 0.08 * Math.max(0, 1 - Math.abs(y) / Math.max(R * 0.78, 1));
    const oval = R * 0.55 + fold;
    tx = Math.cos(a) * oval + split;
    ty = Math.sin(a) * oval * 0.72;
  } else if (_currentScaleShape === 'heart') {
    const s = Math.min(1, r / Math.max(R * 0.8, 1));
    const t = a;
    const hx = 16 * Math.sin(t) ** 3;
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    tx = (hx / 18) * R * 0.68 * s;
    ty = (-hy / 18) * R * 0.68 * s + R * 0.08;
  } else if (_currentScaleShape === 'losange') {
    const denom = Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)) + 0.001;
    const diamondRadius = (R * 0.62) / denom;
    const s = Math.min(1, r / Math.max(R * 0.82, 1));
    tx = Math.cos(a) * diamondRadius * s;
    ty = Math.sin(a) * diamondRadius * s;
  }

  return {
    x: lerp(x, tx, amount),
    y: lerp(y, ty, amount),
  };
}

function galaxyShapeTransform(
  x: number,
  y: number,
  z: number,
  R: number,
  amount: number,
  beatPhase: number,
): { x: number; y: number; z: number } {
  if (_galaxyShape === 'galaxy' || amount <= 0.001) return { x, y, z };
  const r = Math.sqrt(x * x + y * y) + 1;
  const a = Math.atan2(y, x);
  let tx = x;
  let ty = y;
  let tz = z;

  if (_galaxyShape === 'vortex') {
    const cone = 1 - Math.min(1, r / Math.max(R, 1));
    const twist = a + cone * 2.4 + Math.sin(beatPhase) * 0.12;
    tx = Math.cos(twist) * r * (0.86 + cone * 0.2);
    ty = Math.sin(twist) * r * 0.72;
    tz = z + cone * R * 0.24;
  } else if (_galaxyShape === 'eye') {
    const iris = R * 0.45 + Math.sin(a * 2 + beatPhase) * R * 0.035;
    const s = Math.min(1, r / Math.max(R * 0.86, 1));
    tx = Math.cos(a) * lerp(r, iris * s, 0.75);
    ty = Math.sin(a) * lerp(r * 0.58, iris * 0.34 * s, 0.72);
    tz = z * 0.45;
  } else if (_galaxyShape === 'tunnel') {
    const lane = 0.52 + Math.sin(a * 3 + beatPhase * 0.7) * 0.08;
    tx = Math.cos(a) * r * lane;
    ty = Math.sin(a) * r * lane;
    tz = z + (r / Math.max(R, 1)) * R * 0.38;
  } else if (_galaxyShape === 'double') {
    const side = Math.sin(a) >= 0 ? 1 : -1;
    const orbit = R * 0.28;
    tx = Math.cos(a * 1.2 + side * 0.8) * r * 0.58 + side * orbit;
    ty = Math.sin(a * 1.2 + side * 0.8) * r * 0.42;
    tz = z + side * Math.sin(beatPhase) * R * 0.025;
  }

  return {
    x: lerp(x, tx, amount),
    y: lerp(y, ty, amount),
    z: lerp(z, tz, amount),
  };
}

function buildPlasma(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const count = Math.max(400, Math.round(lerp(800, 2200, iF)));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const r = Math.sqrt(Math.random()) * R * 0.88;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  tmpCol.setHSL(0.08, 1.0, 0.6);
  const pts = new THREE.Points(
    geo,
    ptsMat(hdrColor([tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255], iF, 2.8), 1.8, 0.7),
  );
  pts.userData.tag = 'plasmaField';
  pts.userData.count = count;
  pts.userData.prevT = -1;
  group.add(pts);

  // Bright solar core
  const sunCount = Math.max(20, Math.round(100 * iF));
  const sunPos = new Float32Array(sunCount * 3);
  for (let i = 0; i < sunCount; i++) {
    const a = Math.random() * TAU;
    const r = Math.random() * R * 0.08;
    sunPos[i * 3] = Math.cos(a) * r;
    sunPos[i * 3 + 1] = Math.sin(a) * r;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sunPos, 3));
  const sun = new THREE.Points(sGeo, ptsMat(hdrColor([255, 245, 190], iF, 3.2), 2.8, 0.8));
  sun.userData.tag = 'plasmaSun';
  group.add(sun);

  return group;
}

function updatePlasma(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed * 0.8;
  const freq = (Math.max(1, Math.round(cfg.symmetry)) * Math.PI) / Math.max(R, 1);
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const baseRgb = pal.rgb;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;

    if (tag === 'plasmaField') {
      const pts = child as THREE.Points;
      const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = child.userData.count as number;
      const prevT = child.userData.prevT as number;
      const dt = prevT < 0 ? 16 : Math.min(t - prevT, 32);
      child.userData.prevT = t;
      const amplitude = R * 0.014 * speed * (dt / 16);
      const tSlow = t * 0.0006 * speed;

      for (let i = 0; i < count; i++) {
        const x = arr[i * 3];
        const y = arr[i * 3 + 1];
        const r = Math.max(Math.sqrt(x * x + y * y), 1);
        const cosA = x / r;
        const sinA = y / r;
        // Curl wave vorticity
        const vx = Math.sin(x * freq) * Math.cos(y * freq + tSlow) * amplitude;
        const vy = -Math.cos(x * freq) * Math.sin(y * freq + tSlow) * amplitude;
        // Tangential rotation (stronger near centre)
        const vRot = amplitude * 1.3 * Math.max(0, 1 - r / R);
        // Gentle inward spiral beyond inner core
        const vIn = r > R * 0.12 ? -amplitude * 0.22 : amplitude * 0.5;
        let nx = x + vx + -sinA * vRot + cosA * vIn;
        let ny = y + vy + cosA * vRot + sinA * vIn;
        const nr = Math.sqrt(nx * nx + ny * ny);
        if (nr > R * 0.88 || nr < R * 0.018) {
          const a = Math.random() * Math.PI * 2;
          const rr = (0.15 + Math.random() * 0.65) * R;
          nx = Math.cos(a) * rr;
          ny = Math.sin(a) * rr;
        }
        // Finger distortion: chaotic outward burst from pointer
        if (_distortActive) {
          const f = fingerForce(nx, ny, 0, R * 0.48);
          nx += f.x * (0.8 + speed * 1.2);
          ny += f.y * (0.8 + speed * 1.2);
        }
        arr[i * 3] = nx;
        arr[i * 3 + 1] = ny;
      }
      posAttr.needsUpdate = true;

      const rgb: [number, number, number] = [
        lerp(baseRgb[0], 255, glowF * 0.16),
        lerp(baseRgb[1], 255, glowF * 0.16),
        lerp(baseRgb[2], 255, glowF * 0.16),
      ];
      updateMat(child, rgb, iF, 2.6);
    } else if (tag === 'plasmaSun') {
      const pulse = 1.0 + Math.sin(t * 0.0014 * speed) * 0.1;
      child.scale.setScalar(pulse);
      tmpCol.setRGB(
        lerp(baseRgb[0] / 255, 1, 0.45),
        lerp(baseRgb[1] / 255, 1, 0.45),
        lerp(baseRgb[2] / 255, 1, 0.45),
      );
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      updateMat(child, rgb, iF * 1.15, 2.2);
    }
  }
}

/* ── GLOBE mode — 3D sphere with spectral latitude bands ─────── */

function buildNebula(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const density = cfg.complexity / 10;
  const arms = Math.max(2, Math.round(cfg.symmetry));
  const count = Math.max(900, Math.round(lerp(1800, 5200, density)));
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const arm = i % arms;
    const p = Math.random();
    const theta = arm * (TAU / arms) + p * TAU * 0.62 + (Math.random() - 0.5) * 0.42;
    const r = R * (0.08 + p ** 0.75 * 0.95);
    const haze = (1 - p) * R * 0.08 + R * 0.018;
    positions[i * 3] = Math.cos(theta) * r + (Math.random() - 0.5) * haze;
    positions[i * 3 + 1] = Math.sin(theta) * r * 0.58 + (Math.random() - 0.5) * haze;
    positions[i * 3 + 2] = (Math.random() - 0.5) * R * 0.18;
  }

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);

  const pts = new THREE.Points(geo, ptsMat(hdrColor([rr, gg, bb], iF, 2.35), 1.9, 0.58));
  pts.userData.tag = 'nebulaDust';
  pts.userData.count = count;
  pts.userData.prevT = -1;
  group.add(pts);

  return group;
}

function updateNebula(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed * 0.38;
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const baseRgb = pal.rgb;
  const limit = R * 1.1;
  const limit2 = limit * limit;
  const galaxyMusicMode = cfg.mode === 'nebula' && cfg.complexity >= 9;
  const beatPhase = (t / 1000) * Math.PI * 2 * (_musicBpm / 60);
  if (galaxyMusicMode) {
    _musicPulse *= 0.945;
    _musicBass *= 0.97;
    _musicDrums *= 0.9;
    _musicPads *= 0.985;
    _musicKeys *= 0.975;
    _musicLead *= 0.92;
  }
  const internalPulse = galaxyMusicMode ? ((Math.sin(beatPhase) + 1) / 2) ** 3 * 0.22 : 0;
  const impact = galaxyMusicMode
    ? Math.min(1, internalPulse + _musicDrums * 0.7 + _musicPulse * 0.4)
    : 0;
  const gravity = galaxyMusicMode ? Math.min(1, _musicBass * 0.9 + internalPulse * 0.25) : 0;
  const haze = galaxyMusicMode
    ? Math.min(1, _musicPads * 0.62 + _musicKeys * 0.28 + internalPulse * 0.18)
    : 0;
  const sparks = galaxyMusicMode ? Math.min(1, _musicLead * 0.72 + _musicDrums * 0.34) : 0;
  const colourShift = galaxyMusicMode
    ? Math.min(1, (sparks * 0.55 + haze * 0.22 + impact * 0.2) * 0.42)
    : 0;

  for (const child of group.children) {
    if ((child.userData.tag as string) !== 'nebulaDust') continue;
    const pts = child as THREE.Points;
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const count = child.userData.count as number;
    const prevT = child.userData.prevT as number;
    const dt = prevT < 0 ? 16 : Math.min(t - prevT, 32);
    child.userData.prevT = t;
    const drift =
      R *
      0.0045 *
      speed *
      (dt / 16) *
      (1 + impact * _galaxyImpact * 0.42 + haze * _galaxyHaze * 0.24);
    const tSlow = t * 0.00035 * speed;

    for (let i = 0; i < count; i++) {
      const x = arr[i * 3];
      const y = arr[i * 3 + 1];
      const z = arr[i * 3 + 2];
      const r = Math.sqrt(x * x + y * y) + 1;
      const swirl = 0.28 + 0.72 * Math.max(0, 1 - r / limit);
      const localBeat = 0.5 + Math.sin(beatPhase - r * 0.035 + (i % 17) * 0.31) * 0.5;
      const armDrive = galaxyMusicMode
        ? 1 + _galaxyArms * impact * 0.55 + _galaxyGravity * gravity * 0.28
        : 1;
      const radial = galaxyMusicMode
        ? (x / r) * gravity * _galaxyGravity * localBeat * R * 0.0018 -
          (x / r) * impact * _galaxyImpact * R * 0.0007
        : 0;
      const radialY = galaxyMusicMode
        ? (y / r) * gravity * _galaxyGravity * localBeat * R * 0.0018 -
          (y / r) * impact * _galaxyImpact * R * 0.0007
        : 0;
      let nx =
        x +
        (-y / r) * drift * swirl * armDrive +
        Math.sin(y * 0.012 + tSlow) * drift * 0.25 +
        radial;
      let ny =
        y +
        (x / r) * drift * swirl * 0.65 * armDrive +
        Math.cos(x * 0.01 - tSlow) * drift * 0.22 +
        radialY;
      let nz =
        z +
        Math.sin((x - y) * 0.005 + tSlow) * drift * 0.18 +
        (galaxyMusicMode ? (haze * _galaxyHaze + sparks * _galaxySparks) * R * 0.0012 : 0);

      if (galaxyMusicMode) {
        const shaped = galaxyShapeTransform(
          nx,
          ny,
          nz,
          R,
          Math.min(
            1,
            _galaxyDepth * 0.42 + _galaxyArms * impact * 0.16 + _galaxyGravity * gravity * 0.18,
          ),
          beatPhase,
        );
        nx = shaped.x;
        ny = shaped.y;
        nz = shaped.z;
      }

      if (_distortActive) {
        const f = fingerForce(nx, ny, nz, R * 0.62);
        nx += f.x * (0.6 + speed);
        ny += f.y * (0.6 + speed);
        nz += f.z * 0.4;
      }

      if (nx * nx + ny * ny > limit2) {
        const a = Math.atan2(ny, nx) + Math.PI + (Math.random() - 0.5) * 0.7;
        const rr = R * (0.08 + Math.random() * 0.35);
        nx = Math.cos(a) * rr;
        ny = Math.sin(a) * rr * 0.6;
        nz = (Math.random() - 0.5) * R * 0.18;
      }

      arr[i * 3] = nx;
      arr[i * 3 + 1] = ny;
      arr[i * 3 + 2] = nz;
    }
    posAttr.needsUpdate = true;

    const rgb: [number, number, number] = [
      lerp(baseRgb[0], 255, glowF * 0.18 + colourShift * 0.22),
      lerp(baseRgb[1], 235, glowF * 0.16 + colourShift * 0.14),
      lerp(baseRgb[2], 210, glowF * 0.14 + colourShift * 0.1),
    ];
    updateMat(child, rgb, iF, 2.45 + impact * _galaxyImpact * 0.75 + sparks * _galaxySparks * 0.65);
    const mat = pts.material as THREE.PointsMaterial;
    if (galaxyMusicMode) {
      mat.size = 1.65 + impact * _galaxyImpact * 1.3 + sparks * _galaxySparks * 1.0;
      mat.opacity = 0.46 + haze * _galaxyHaze * 0.22 + sparks * _galaxySparks * 0.12;
    }
    group.rotation.z =
      Math.sin(t * 0.00008 * cfg.breathSpeed) * 0.08 +
      (galaxyMusicMode ? impact * _galaxyArms * 0.018 : 0);
  }
}

function buildGlobe(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const latBands = Math.max(3, Math.round(cfg.complexity) + 2);
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  // Sphere surface ambient point cloud
  const totalPts = Math.max(200, Math.round(lerp(500, 2000, iF)));
  const surfPos = new Float32Array(totalPts * 3);
  for (let i = 0; i < totalPts; i++) {
    const theta = TAU * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    const sr = R * lerp(0.88, 0.94, glowF);
    surfPos[i * 3] = sr * Math.sin(phi) * Math.cos(theta);
    surfPos[i * 3 + 1] = sr * Math.sin(phi) * Math.sin(theta);
    surfPos[i * 3 + 2] = sr * Math.cos(phi);
  }
  const surfGeo = new THREE.BufferGeometry();
  surfGeo.setAttribute('position', new THREE.BufferAttribute(surfPos, 3));
  tmpCol.setHSL(0.58, 0.8, 0.4);
  const surfPts = new THREE.Points(
    surfGeo,
    ptsMat(hdrColor([tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255], iF, 2.0), 1.5, 0.55),
  );
  surfPts.userData.tag = 'globeSurface';
  group.add(surfPts);

  // Spectral latitude rings
  for (let lat = 1; lat < latBands; lat++) {
    const frac = lat / latBands;
    const coLat = Math.PI * frac;
    const latR = R * 0.92 * Math.sin(coLat);
    const zLat = R * 0.92 * Math.cos(coLat);
    if (latR < R * 0.04) continue;
    const hue = SPEC_HUES[lat % SPEC_HUES.length];
    tmpCol.setHSL(hue, 1.0, 0.58);
    const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
    const latPtsCount = Math.max(20, Math.round((latR / R) * 200 * iF));
    const latPos = new Float32Array(latPtsCount * 3);
    for (let i = 0; i < latPtsCount; i++) {
      const a = (i / latPtsCount) * TAU + (Math.random() - 0.5) * 0.06;
      const lr = latR * (1.0 + (Math.random() - 0.5) * 0.04);
      latPos[i * 3] = Math.cos(a) * lr;
      latPos[i * 3 + 1] = Math.sin(a) * lr;
      latPos[i * 3 + 2] = zLat;
    }
    const latGeo = new THREE.BufferGeometry();
    latGeo.setAttribute('position', new THREE.BufferAttribute(latPos, 3));
    const latPts = new THREE.Points(latGeo, ptsMat(hdrColor(rgb, iF, 2.7), 2.2, 0.7));
    latPts.userData.tag = 'globeLatRing';
    latPts.userData.hue = hue;
    latPts.userData.lat = lat;
    group.add(latPts);
  }

  return group;
}

function updateGlobe(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const timeHue = (t * 0.00004) % 1.0;
  const tmpCol = new THREE.Color();

  group.rotation.y = t * 0.00018 * breathSpeed;
  group.rotation.x = Math.sin(t * 0.00009 * breathSpeed) * 0.2;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'globeSurface') {
      const h = (0.56 + timeHue * 0.12) % 1.0;
      tmpCol.setHSL(h, 0.8, 0.42);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      updateMat(child, rgb, iF * 0.65, 1.8);
    } else if (tag === 'globeLatRing') {
      const lat = child.userData.lat as number;
      const hue = ((child.userData.hue as number) + timeHue) % 1.0;
      tmpCol.setHSL(hue, 1.0, 0.58);
      const rgb: [number, number, number] = [tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255];
      child.rotation.z = t * 0.00014 * breathSpeed * (lat % 2 === 0 ? 1 : -1);
      updateMat(child, rgb, iF, 2.5);
    }
  }
}

/* ── CURRENT 3D mode — 3D divergence-free curl flow ─────────── */

function buildCurrent3D(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const count = Math.max(600, Math.round(lerp(1500, 4000, iF)));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * TAU;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * R * 0.88;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  tmpCol.setHSL(lerp(0.58, 0.72, glowF), 1.0, 0.58);
  const pts = new THREE.Points(
    geo,
    ptsMat(hdrColor([tmpCol.r * 255, tmpCol.g * 255, tmpCol.b * 255], iF, 2.4), 1.5, 0.65),
  );
  pts.userData.tag = 'current3dField';
  pts.userData.count = count;
  pts.userData.prevT = -1;
  group.add(pts);
  return group;
}

function updateCurrent3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed * 0.7;
  const freq = (Math.max(1, Math.round(cfg.symmetry)) * Math.PI) / Math.max(R, 1);
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const baseRgb = pal.rgb;
  const R2 = R * R * 0.84;

  for (const child of group.children) {
    if ((child.userData.tag as string) !== 'current3dField') continue;
    const pts = child as THREE.Points;
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const count = child.userData.count as number;
    const prevT = child.userData.prevT as number;
    const dt = prevT < 0 ? 16 : Math.min(t - prevT, 32);
    child.userData.prevT = t;
    const amp = R * 0.011 * speed * (dt / 16);
    const ts = t * 0.00035 * speed;
    const f = freq;

    for (let i = 0; i < count; i++) {
      const x = arr[i * 3];
      const y = arr[i * 3 + 1];
      const z = arr[i * 3 + 2];
      // Divergence-free 3D curl: curl(ψ) where ψ = (sin(y·f+ts), sin(z·f+ts·0.7), sin(x·f+ts·0.5))
      const vx = (Math.cos(z * f + ts * 0.7) * f - Math.cos(y * f + ts) * f) * amp;
      const vy = (Math.cos(x * f + ts * 0.5) * f - Math.cos(z * f + ts * 0.7) * f) * amp;
      const vz = (Math.cos(y * f + ts) * f - Math.cos(x * f + ts * 0.5) * f) * amp;
      let nx = x + vx;
      let ny = y + vy;
      let nz = z + vz;
      if (nx * nx + ny * ny + nz * nz > R2) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.cbrt(Math.random() * 0.5) * R * 0.62;
        nx = r * Math.sin(phi) * Math.cos(theta);
        ny = r * Math.sin(phi) * Math.sin(theta);
        nz = r * Math.cos(phi);
      }
      // Finger distortion: 3D repulsion from projected pointer
      if (_distortActive) {
        const f = fingerForce(nx, ny, nz, R * 0.5);
        nx += f.x * (0.75 + speed);
        ny += f.y * (0.75 + speed);
        nz += f.z * (0.75 + speed);
      }
      arr[i * 3] = nx;
      arr[i * 3 + 1] = ny;
      arr[i * 3 + 2] = nz;
    }
    posAttr.needsUpdate = true;

    const rgb: [number, number, number] = [
      lerp(baseRgb[0], 255, glowF * 0.14),
      lerp(baseRgb[1], 255, glowF * 0.14),
      lerp(baseRgb[2], 255, glowF * 0.14),
    ];
    updateMat(child, rgb, iF, 2.2);
    group.rotation.y += 0.00022 * speed * (dt / 16);
    group.rotation.x += 0.00011 * speed * (dt / 16);
  }
}

/* ── MATRIX mode — canvas overlay carries all rendering ──────── */

const MATRIX_COLS = 48;
const MATRIX_TAIL = 20;
const _MATRIX_TOTAL = MATRIX_COLS * MATRIX_TAIL;

// Three.js layer intentionally empty — canvas overlay renders char rain + rings
function buildMatrix(_cfg: Cfg, _R: number): THREE.Group {
  return new THREE.Group();
}

function updateMatrix(_group: THREE.Group, _cfg: Cfg, _t: number, _R: number): void {
  // Canvas overlay handles all matrix rendering
}

/* ── MATRIX 3D — multi-depth column rain in Three.js ────────── */
const MTX3D_LAYERS = 5;
const MTX3D_COLS = 28;
const MTX3D_TAIL = 22;
const _MTX3D_TOTAL = MTX3D_LAYERS * MTX3D_COLS * MTX3D_TAIL;

function buildMatrix3D(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Matrix Green'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;

  for (let layer = 0; layer < MTX3D_LAYERS; layer++) {
    const zPos = R * ((layer / (MTX3D_LAYERS - 1)) * 1.8 - 0.9);
    const positions = new Float32Array(MTX3D_COLS * MTX3D_TAIL * 3);
    const colors = new Float32Array(MTX3D_COLS * MTX3D_TAIL * 3);
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('color', colAttr);

    const depthFade = 1 - Math.abs(zPos) / (R * 1.2);
    const mat = new THREE.PointsMaterial({
      size: 2.8 + depthFade * 1.4,
      vertexColors: true,
      sizeAttenuation: false,
      transparent: true,
      opacity: iF * (0.28 + depthFade * 0.62),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.userData.tag = 'mtx3dLayer';
    pts.userData.layer = layer;
    pts.userData.zPos = zPos;

    const headYs = new Float32Array(MTX3D_COLS);
    const speeds = new Float32Array(MTX3D_COLS);
    for (let c = 0; c < MTX3D_COLS; c++) {
      headYs[c] = (Math.random() * 2 - 1) * R;
      speeds[c] = (0.3 + Math.random() * 0.7) * (0.4 + depthFade * 0.6);
    }
    pts.userData.headYs = headYs;
    pts.userData.speeds = speeds;
    pts.userData.rr = rr;
    pts.userData.gg = gg;
    pts.userData.bb = bb;
    group.add(pts);
  }
  return group;
}

function updateMatrix3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const breathSpeed = cfg.breathSpeed;
  const pal = PAL[cfg.preset] ?? PAL['Matrix Green'];
  const [pr, pg, pb] = pal.rgb;
  const timeHue = (t * 0.000028) % 1.0;
  const tmpCol = new THREE.Color();
  void t;

  for (const child of group.children) {
    if ((child.userData.tag as string) !== 'mtx3dLayer') continue;
    const pts = child as THREE.Points;
    const zPos = child.userData.zPos as number;
    const headYs = child.userData.headYs as Float32Array;
    const speeds = child.userData.speeds as Float32Array;
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = pts.geometry.getAttribute('color') as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;
    const depthFade = 1 - Math.abs(zPos) / (R * 1.2);

    const colSpacing = (R * 1.7) / (MTX3D_COLS + 1);
    const rowSpacing = (R * 2.0) / MTX3D_TAIL;

    for (let c = 0; c < MTX3D_COLS; c++) {
      const cx = -R * 0.85 + (c + 1) * colSpacing;
      headYs[c] -= speeds[c] * breathSpeed * rowSpacing * 0.012;
      if (headYs[c] < -R - MTX3D_TAIL * rowSpacing) headYs[c] = R * 1.1;

      for (let dot = 0; dot < MTX3D_TAIL; dot++) {
        const idx = c * MTX3D_TAIL + dot;
        posArr[idx * 3] = cx + zPos * 0.18 * (c / MTX3D_COLS - 0.5);
        posArr[idx * 3 + 1] = headYs[c] + dot * rowSpacing;
        posArr[idx * 3 + 2] = zPos;

        const tailFrac = 1 - dot / MTX3D_TAIL;
        const bright = tailFrac * tailFrac * depthFade;
        if (dot === 0) {
          // Head: bright white flash
          const hw = 0.7 + depthFade * 0.3;
          colArr[idx * 3] = hw;
          colArr[idx * 3 + 1] = 1.0;
          colArr[idx * 3 + 2] = hw * 0.88;
        } else {
          const colHue = (timeHue + (c / MTX3D_COLS) * 0.6 + dot * 0.02) % 1.0;
          tmpCol.setHSL(colHue, 0.95, 0.48 * bright);
          colArr[idx * 3] = lerp((pr / 255) * bright, tmpCol.r, glowF);
          colArr[idx * 3 + 1] = lerp((pg / 255) * bright, tmpCol.g, glowF);
          colArr[idx * 3 + 2] = lerp((pb / 255) * bright, tmpCol.b, glowF);
        }
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    pts.geometry.setDrawRange(0, MTX3D_COLS * MTX3D_TAIL);
    (pts.material as THREE.PointsMaterial).opacity = iF * (0.28 + depthFade * 0.62);
  }
}

/* ── CATHEDRAL mode — sacred architecture builder ───────────── */

function buildCathedral(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const pal = PAL[cfg.preset] ?? PAL['Sacred Vitral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.max(4, Math.round(cfg.symmetry));
  const layers = Math.max(1, Math.round(cfg.complexity));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  // Gothic arches — pairs of mirrored bezier curves radiating outward
  for (let s = 0; s < sym; s++) {
    const ang = (s / sym) * TAU;
    const archGroup = new THREE.Group();
    archGroup.rotation.z = ang;
    archGroup.userData.tag = 'arch';
    archGroup.userData.sectorIdx = s;

    for (let l = 1; l <= layers; l++) {
      const archH = R * (l / layers) * 0.95;
      const archW = archH * 0.28;
      const pts: number[] = [];
      const N = 24;

      // Left pillar + gothic arch: vertical + pointed curve
      for (let k = 0; k <= N; k++) {
        const ti = k / N;
        // Bezier: base at (±archW, 0) to apex at (0, archH) with gothic point
        const x = (1 - ti) * (1 - ti) * archW + 2 * ti * (1 - ti) * (archW * 0.15) + ti * ti * 0;
        const y = (1 - ti) * (1 - ti) * 0 + 2 * ti * (1 - ti) * archH * 0.7 + ti * ti * archH;
        pts.push(x, y, 0);
      }
      for (let k = N; k >= 0; k--) {
        const ti = k / N;
        const x = -(1 - ti) * (1 - ti) * archW - 2 * ti * (1 - ti) * (archW * 0.15) - ti * ti * 0;
        const y = (1 - ti) * (1 - ti) * 0 + 2 * ti * (1 - ti) * archH * 0.7 + ti * ti * archH;
        pts.push(x, y, 0);
      }

      const hue = ((l / layers) * 0.35 + (s / sym) * 0.1) % 1.0;
      tmpCol.setHSL(hue, 0.7, 0.55);
      const archCol: [number, number, number] = [
        lerp(rr, tmpCol.r * 255, cfg.glow / 10),
        lerp(gg, tmpCol.g * 255, cfg.glow / 10),
        lerp(bb, tmpCol.b * 255, cfg.glow / 10),
      ];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      const arch = new THREE.Line(
        geo,
        lineMat(hdrColor(archCol, iF * (0.4 + (l / layers) * 0.6), 1.8), 0.85),
      );
      arch.userData.archLayer = l;
      archGroup.add(arch);
    }
    group.add(archGroup);
  }

  // Rose window — concentric rings + radial tracery (Islamic geometric pattern)
  const roseSym = sym * 2;
  for (let i = 1; i <= Math.min(layers + 2, 6); i++) {
    const r = R * 0.25 * (i / 6);
    const hue = (i * 0.14 + 0.55) % 1.0;
    tmpCol.setHSL(hue, 0.85, 0.55);
    const roseCol: [number, number, number] = [
      lerp(rr, tmpCol.r * 255, cfg.glow / 10),
      lerp(gg, tmpCol.g * 255, cfg.glow / 10),
      lerp(bb, tmpCol.b * 255, cfg.glow / 10),
    ];
    const ring = new THREE.Line(circleGeo(64), lineMat(hdrColor(roseCol, iF * 0.9, 2.0), 0.9));
    ring.scale.setScalar(r);
    ring.userData.tag = 'roseRing';
    ring.userData.baseR = r;
    ring.userData.hue = hue;
    group.add(ring);
  }
  // Tracery spokes
  for (let s = 0; s < roseSym; s++) {
    const a = (s / roseSym) * TAU;
    const maxR = R * 0.25;
    const pts = new Float32Array([0, 0, 0, Math.cos(a) * maxR, Math.sin(a) * maxR, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const hue = ((s / roseSym) * 0.4 + 0.6) % 1.0;
    tmpCol.setHSL(hue, 0.8, 0.55);
    const spokeCol: [number, number, number] = [
      lerp(rr, tmpCol.r * 255, (cfg.glow / 10) * 0.7),
      lerp(gg, tmpCol.g * 255, (cfg.glow / 10) * 0.7),
      lerp(bb, tmpCol.b * 255, (cfg.glow / 10) * 0.7),
    ];
    const spoke = new THREE.Line(geo, lineMat(hdrColor(spokeCol, iF * 0.5, 1.5), 0.7));
    spoke.userData.tag = 'roseSpoke';
    spoke.userData.hue = hue;
    group.add(spoke);
  }

  // Central spire — tall pointed obelisk lines
  const spireH = R * 0.55;
  const spireW = R * 0.06;
  const spirePts = new Float32Array([
    -spireW,
    0,
    0,
    0,
    spireH,
    0,
    0,
    spireH,
    0,
    spireW,
    0,
    0,
    -spireW,
    spireH * 0.3,
    0,
    spireW,
    spireH * 0.3,
    0,
    -spireW * 0.6,
    spireH * 0.6,
    0,
    spireW * 0.6,
    spireH * 0.6,
    0,
  ]);
  const spireGeo = new THREE.BufferGeometry();
  spireGeo.setAttribute('position', new THREE.BufferAttribute(spirePts, 3));
  const spire = new THREE.LineSegments(
    spireGeo,
    lineMat(hdrColor([rr, gg, bb], iF * 0.7, 2.0), 0.9),
  );
  spire.userData.tag = 'spire';
  group.add(spire);

  const center = buildCenter([rr, gg, bb], iF * 0.8, R / 210);
  center.userData.tag = 'center';
  group.add(center);

  return group;
}

function updateCathedral(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Sacred Vitral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const breath = (Math.sin(t * 0.001 * breathSpeed) + 1) * 0.5;
  const bs = 0.94 + breath * 0.06;
  const timeHue = (t * 0.000045) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'arch') {
      const sectorIdx = child.userData.sectorIdx as number;
      // Arches breathe outward and rotate very slowly
      const sector = child as THREE.Group;
      sector.scale.setScalar(bs);
      sector.rotation.z =
        (sectorIdx / Math.max(1, cfg.symmetry)) * Math.PI * 2 + t * 0.00004 * breathSpeed;
      sector.children.forEach((arch, li) => {
        const hue = ((li / sector.children.length) * 0.35 + timeHue) % 1.0;
        tmpCol.setHSL(hue, 0.7, 0.55);
        const col: [number, number, number] = [
          lerp(rr, tmpCol.r * 255, cfg.glow / 10),
          lerp(gg, tmpCol.g * 255, cfg.glow / 10),
          lerp(bb, tmpCol.b * 255, cfg.glow / 10),
        ];
        updateMat(
          arch as THREE.Object3D,
          col,
          iF * (0.4 + ((li + 1) / sector.children.length) * 0.6),
          1.8,
        );
      });
    } else if (tag === 'roseRing') {
      const hue = ((child.userData.hue as number) + timeHue * 1.5) % 1.0;
      tmpCol.setHSL(hue, 0.85, 0.55);
      const col: [number, number, number] = [
        lerp(rr, tmpCol.r * 255, cfg.glow / 10),
        lerp(gg, tmpCol.g * 255, cfg.glow / 10),
        lerp(bb, tmpCol.b * 255, cfg.glow / 10),
      ];
      child.rotation.z = t * 0.00025 * breathSpeed;
      child.scale.setScalar((child.userData.baseR as number) * (0.96 + breath * 0.04));
      updateMat(child as THREE.Object3D, col, iF * 0.9, 2.0);
    } else if (tag === 'roseSpoke') {
      const hue = ((child.userData.hue as number) + timeHue * 0.8) % 1.0;
      tmpCol.setHSL(hue, 0.8, 0.55);
      const col: [number, number, number] = [
        lerp(rr, tmpCol.r * 255, (cfg.glow / 10) * 0.7),
        lerp(gg, tmpCol.g * 255, (cfg.glow / 10) * 0.7),
        lerp(bb, tmpCol.b * 255, (cfg.glow / 10) * 0.7),
      ];
      child.rotation.z = t * 0.00015 * breathSpeed;
      updateMat(child as THREE.Object3D, col, iF * 0.5, 1.5);
    } else if (tag === 'spire') {
      child.scale.setScalar(bs);
      updateMat(child as THREE.Object3D, [rr, gg, bb], iF * 0.7, 2.0);
    } else if (tag === 'center') {
      updateCenter(child as THREE.Group, breath, [rr, gg, bb], iF * 0.8, R / 210);
    }
  }
}

/* ── BLOOM mode — infinite mandala expansion illusion ───────── */

function buildBloom(cfg: Cfg, R: number): THREE.Group {
  const TAU = Math.PI * 2;
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.max(4, Math.round(cfg.symmetry));
  const N_LAYERS = Math.max(6, Math.round(cfg.complexity * 1.6));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  for (let li = 0; li < N_LAYERS; li++) {
    const phase = li / N_LAYERS;
    const layerGroup = new THREE.Group();
    layerGroup.userData.tag = 'bloomLayer';
    layerGroup.userData.phase = phase;
    layerGroup.userData.li = li;

    // Sym teardrop petals at unit radius (scale applied at runtime)
    for (let s = 0; s < sym; s++) {
      const ang = (s / sym) * TAU;
      const hue = ((s / sym) * 0.45 + (li / N_LAYERS) * 0.3) % 1.0;
      tmpCol.setHSL(hue, 0.82, 0.55);
      const col: [number, number, number] = [
        lerp(rr, tmpCol.r * 255, cfg.glow / 10),
        lerp(gg, tmpCol.g * 255, cfg.glow / 10),
        lerp(bb, tmpCol.b * 255, cfg.glow / 10),
      ];
      const pts: number[] = [];
      const N = 28;
      const orbit = 0.52;
      const petalA = 0.2;
      const petalB = 0.1; // ellipse half-axes for petal shape
      for (let k = 0; k <= N; k++) {
        const a = (k / N) * TAU;
        // Ellipse rotated to point outward from center
        const px =
          Math.cos(ang) * orbit +
          Math.cos(ang) * petalA * Math.cos(a) -
          Math.sin(ang) * petalB * Math.sin(a);
        const py =
          Math.sin(ang) * orbit +
          Math.sin(ang) * petalA * Math.cos(a) +
          Math.cos(ang) * petalB * Math.sin(a);
        pts.push(px, py, 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      const petal = new THREE.Line(geo, lineMat(hdrColor(col, iF, 1.9), 0.85));
      petal.userData.hue = hue;
      layerGroup.add(petal);
    }

    // Inner circle at unit scale
    const ring = new THREE.Line(
      circleGeo(48),
      lineMat(hdrColor([rr, gg, bb], iF * 0.55, 1.4), 0.5),
    );
    ring.scale.setScalar(0.24);
    ring.userData.tag = 'bloomCenter';
    layerGroup.add(ring);

    // Outer ring
    const outerRing = new THREE.Line(
      circleGeo(64),
      lineMat(hdrColor([rr, gg, bb], iF * 0.28, 1.0), 0.35),
    );
    outerRing.scale.setScalar(0.88);
    outerRing.userData.tag = 'bloomOuter';
    layerGroup.add(outerRing);

    group.add(layerGroup);
  }

  return group;
}

function updateBloom(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const sym = Math.max(4, Math.round(cfg.symmetry));
  const N_LAYERS = group.children.filter((c) => c.userData.tag === 'bloomLayer').length;
  const timeHue = (t * 0.000028) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    if (child.userData.tag !== 'bloomLayer') continue;
    const layer = child as THREE.Group;

    // Advance phase: full cycle ~10s at speed=1
    let phase = (layer.userData.phase as number) + breathSpeed * 0.00007;
    if (phase >= 1.0) phase -= 1.0;
    layer.userData.phase = phase;

    // Scale from near-zero to R
    const sc = Math.max(0.0008, phase) * R;
    layer.scale.setScalar(sc);

    // Opacity: smooth fade in then out using a bell curve
    const op = phase < 0.18 ? phase / 0.18 : phase > 0.72 ? (1 - phase) / 0.28 : 1.0;

    // Slow rotation — inner layers rotate slightly faster
    const li = layer.userData.li as number;
    const rotDir = li % 2 === 0 ? 1 : -1;
    layer.rotation.z = t * 0.000055 * breathSpeed * rotDir * (1 + (N_LAYERS - li) * 0.04);

    // Update petal colors
    let petalIdx = 0;
    for (const c of layer.children) {
      if (c.userData.tag === 'bloomCenter' || c.userData.tag === 'bloomOuter') {
        if ((c as THREE.Line).material instanceof THREE.LineBasicMaterial) {
          ((c as THREE.Line).material as THREE.LineBasicMaterial).opacity =
            op * (c.userData.tag === 'bloomOuter' ? 0.35 : 0.5);
        }
      } else {
        const hue = ((petalIdx / sym) * 0.45 + timeHue + (li / N_LAYERS) * 0.25) % 1.0;
        tmpCol.setHSL(hue, 0.82, 0.55);
        const col: [number, number, number] = [
          lerp(rr, tmpCol.r * 255, cfg.glow / 10),
          lerp(gg, tmpCol.g * 255, cfg.glow / 10),
          lerp(bb, tmpCol.b * 255, cfg.glow / 10),
        ];
        if ((c as THREE.Line).material instanceof THREE.LineBasicMaterial) {
          const mat = (c as THREE.Line).material as THREE.LineBasicMaterial;
          mat.color.copy(hdrColor(col, iF, 1.9));
          mat.opacity = op * 0.88;
        }
        petalIdx++;
      }
    }
  }
}

/* ── LAVA mode — organic morphing blob lava lamp ────────────── */

const LAVA_BLOBS = [
  { freqX: 0.31, freqY: 0.23, phX: 0.0, phY: 1.2, size: 0.33, hueSeed: 0.04 },
  { freqX: 0.17, freqY: 0.29, phX: 2.1, phY: 0.5, size: 0.27, hueSeed: 0.08 },
  { freqX: 0.41, freqY: 0.11, phX: 4.3, phY: 2.8, size: 0.21, hueSeed: 0.01 },
  { freqX: 0.23, freqY: 0.37, phX: 1.5, phY: 4.1, size: 0.31, hueSeed: 0.12 },
  { freqX: 0.13, freqY: 0.44, phX: 3.7, phY: 0.9, size: 0.2, hueSeed: 0.06 },
  { freqX: 0.38, freqY: 0.16, phX: 0.8, phY: 3.3, size: 0.24, hueSeed: 0.09 },
  { freqX: 0.28, freqY: 0.33, phX: 5.1, phY: 1.7, size: 0.18, hueSeed: 0.15 },
  { freqX: 0.19, freqY: 0.27, phX: 2.9, phY: 5.4, size: 0.22, hueSeed: 0.03 },
];

function buildLava(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const nBlobs = Math.max(3, Math.min(8, Math.round(cfg.complexity * 0.85 + 2)));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  for (let i = 0; i < nBlobs; i++) {
    const bd = LAVA_BLOBS[i % LAVA_BLOBS.length];
    const radius = R * bd.size * (0.85 + Math.random() * 0.3);
    const geo = new THREE.SphereGeometry(radius, 28, 20);
    const hue = (bd.hueSeed + cfg.glow * 0.025) % 1.0;
    tmpCol.setHSL(hue, 0.9, 0.52);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(
        lerp(rr / 255, tmpCol.r, iF * 0.75),
        lerp(gg / 255, tmpCol.g, iF * 0.75),
        lerp(bb / 255, tmpCol.b, iF * 0.75),
      ),
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const blob = new THREE.Mesh(geo, mat);
    blob.userData.tag = 'lavaBlob';
    blob.userData.freqX = bd.freqX;
    blob.userData.freqY = bd.freqY;
    blob.userData.phX = bd.phX;
    blob.userData.phY = bd.phY;
    blob.userData.baseRadius = radius;
    blob.userData.hueSeed = bd.hueSeed;
    blob.userData.phasePulse = Math.random() * Math.PI * 2;
    group.add(blob);
  }

  return group;
}

function updateLava(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const ts = t * 0.001 * breathSpeed * 0.28; // very slow time
  const breath = (Math.sin(t * 0.001 * breathSpeed) + 1) * 0.5;
  const timeHue = (t * 0.000032) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    if (child.userData.tag !== 'lavaBlob') continue;
    const blob = child as THREE.Mesh;
    const freqX = blob.userData.freqX as number;
    const freqY = blob.userData.freqY as number;
    const phX = blob.userData.phX as number;
    const phY = blob.userData.phY as number;
    const phasePulse = blob.userData.phasePulse as number;

    // Lissajous-like gentle drift, biased upward/downward for lamp feel
    blob.position.x = Math.sin(ts * freqX + phX) * R * 0.52;
    const rawY = Math.sin(ts * freqY + phY);
    // Soft bounce off top and bottom
    blob.position.y = Math.tanh(rawY * 1.4) * R * 0.62;

    // Organic size pulse — each blob breathes independently
    const sizePulse = 0.88 + 0.14 * Math.sin(ts * 1.1 + phasePulse);
    blob.scale.setScalar(sizePulse + breath * 0.06);

    // Slow color morph
    const hue = ((blob.userData.hueSeed as number) + timeHue + cfg.glow * 0.018) % 1.0;
    tmpCol.setHSL(hue, 0.9, 0.52);
    if (blob.material instanceof THREE.MeshBasicMaterial) {
      blob.material.color.setRGB(
        lerp(rr / 255, tmpCol.r, iF * 0.75),
        lerp(gg / 255, tmpCol.g, iF * 0.75),
        lerp(bb / 255, tmpCol.b, iF * 0.75),
      );
      blob.material.opacity = 0.36 + breath * 0.1 + sizePulse * 0.04;
    }
  }
}

/* ── SPIRE mode — gothic cathedral facade from ground up ─────── */

function buildSpire(cfg: Cfg, R: number): THREE.Group {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const complexity = Math.max(1, Math.round(cfg.complexity));
  const group = new THREE.Group();
  const tmpCol = new THREE.Color();

  // Helpers
  const px = (x: number) => x * R;
  const py = (y: number) => y * R;
  const glowFrac = cfg.glow / 10;

  function glassCol(): [number, number, number] {
    const hue = (glowFrac * 0.35 + 0.55) % 1.0;
    tmpCol.setHSL(hue, 0.88, 0.55);
    return [
      lerp(rr, tmpCol.r * 255, glowFrac),
      lerp(gg, tmpCol.g * 255, glowFrac),
      lerp(bb, tmpCol.b * 255, glowFrac),
    ];
  }

  function addLine(pts: number[], col: [number, number, number], bright = 1.0, op = 1.0, tag = '') {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    const obj = new THREE.Line(geo, lineMat(hdrColor(col, iF * bright, 1.9), op));
    if (tag) obj.userData.tag = tag;
    group.add(obj);
  }

  function addSegs(pts: number[], col: [number, number, number], bright = 1.0, op = 1.0, tag = '') {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    const obj = new THREE.LineSegments(geo, lineMat(hdrColor(col, iF * bright, 1.9), op));
    if (tag) obj.userData.tag = tag;
    group.add(obj);
  }

  function gothicArch(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    peakX: number,
    peakY: number,
    col: [number, number, number],
    bright: number,
    op: number,
    tag: string,
  ) {
    const N = 24;
    const pts: number[] = [];
    // Left half bezier: (x0,y0) -> ctrl -> (peakX,peakY)
    const lc1x = x0 + (peakX - x0) * 0.1;
    const lc1y = y0 + (peakY - y0) * 0.72;
    for (let k = 0; k <= N; k++) {
      const ti = k / N;
      const u = 1 - ti;
      pts.push(
        u * u * x0 + 2 * u * ti * lc1x + ti * ti * peakX,
        u * u * y0 + 2 * u * ti * lc1y + ti * ti * peakY,
        0,
      );
    }
    // Right half bezier: (peakX,peakY) -> ctrl -> (x1,y1)
    const rc1x = peakX + (x1 - peakX) * 0.9;
    const rc1y = peakY + (y1 - peakY) * 0.28;
    for (let k = 0; k <= N; k++) {
      const ti = k / N;
      const u = 1 - ti;
      pts.push(
        u * u * peakX + 2 * u * ti * rc1x + ti * ti * x1,
        u * u * peakY + 2 * u * ti * rc1y + ti * ti * y1,
        0,
      );
    }
    addLine(pts, col, bright, op, tag);
  }

  // ── Proportions (all in R units)
  const bY = -0.9; // base Y
  const tW = 0.14; // tower half-width
  const lTC = -0.54; // left tower center X
  const rTC = 0.54; // right tower center X
  const nHW = 0.36; // nave half-width
  const tH = 0.6; // tower top (before pediment)
  const nH = 0.18; // nave top
  const aH = -0.15; // aisle top
  const spH = 0.95; // spire tip

  const stone: [number, number, number] = [rr, gg, bb];
  const glass = glassCol();

  // ── 1. Foundation
  addSegs([px(-0.9), py(bY), 0, px(0.9), py(bY), 0], stone, 0.65, 0.9, 'stone');

  // ── 2. Towers (always visible)
  if (complexity >= 1) {
    for (const [tc] of [
      [lTC, -1],
      [rTC, 1],
    ] as [number, number][]) {
      addLine(
        [
          px(tc - tW),
          py(bY),
          0,
          px(tc - tW),
          py(tH),
          0,
          px(tc + tW),
          py(tH),
          0,
          px(tc + tW),
          py(bY),
          0,
        ],
        stone,
        0.92,
        1.0,
        'stone',
      );
      // Tower vertical center line
      addLine([px(tc), py(bY), 0, px(tc), py(tH), 0], stone, 0.4, 0.35, 'stone');
    }
  }

  // ── 3. Nave walls
  if (complexity >= 1) {
    addLine([px(-nHW), py(bY), 0, px(-nHW), py(nH), 0], stone, 0.88, 0.95, 'stone');
    addLine([px(nHW), py(bY), 0, px(nHW), py(nH), 0], stone, 0.88, 0.95, 'stone');
  }

  // ── 4. Aisle roofs + floors
  if (complexity >= 2) {
    addLine([px(lTC + tW), py(aH), 0, px(-nHW), py(aH), 0], stone, 0.72, 0.85, 'stone');
    addLine([px(rTC - tW), py(aH), 0, px(nHW), py(aH), 0], stone, 0.72, 0.85, 'stone');
  }

  // ── 5. Main portal: large pointed arch at base center
  if (complexity >= 2) {
    const apW = nHW * 0.58;
    const apH = nH - bY;
    gothicArch(
      px(-apW),
      py(bY),
      px(apW),
      py(bY),
      px(0),
      py(bY + apH * 0.8),
      glass,
      1.15,
      1.0,
      'glass',
    );
  }

  // ── 6. Nave clerestory arch
  if (complexity >= 3) {
    const navePts: number[] = [];
    const N = 28;
    for (let k = 0; k <= N; k++) {
      const ti = k / N;
      const x = lerp(px(-nHW), px(0), ti);
      const y =
        py(aH) + (py(nH) - py(aH)) * (Math.sin(ti * Math.PI) * (1 + Math.cos(ti * Math.PI) * 0.12));
      navePts.push(x, y, 0);
    }
    for (let k = N; k >= 0; k--) {
      const ti = k / N;
      const x = lerp(px(0), px(nHW), 1 - ti);
      const y =
        py(aH) + (py(nH) - py(aH)) * (Math.sin(ti * Math.PI) * (1 + Math.cos(ti * Math.PI) * 0.12));
      navePts.push(x, y, 0);
    }
    addLine(navePts, stone, 0.82, 0.88, 'stone');
  }

  // ── 7. Rose window
  if (complexity >= 3) {
    const rR = py(0.16);
    const rCY = py(-0.02);
    const ring1 = new THREE.Line(circleGeo(64), lineMat(hdrColor(glass, iF * 1.15, 2.3), 1.0));
    ring1.scale.setScalar(rR);
    ring1.position.y = rCY;
    ring1.userData.tag = 'roseOuter';
    group.add(ring1);

    const ring2 = new THREE.Line(circleGeo(48), lineMat(hdrColor(glass, iF * 0.85, 2.0), 0.8));
    ring2.scale.setScalar(rR * 0.58);
    ring2.position.y = rCY;
    ring2.userData.tag = 'roseInner';
    group.add(ring2);

    const spokeSym = Math.max(8, Math.round(cfg.symmetry));
    const spokePts: number[] = [];
    for (let s = 0; s < spokeSym; s++) {
      const a = (s / spokeSym) * Math.PI * 2;
      spokePts.push(0, rCY, 0, Math.cos(a) * rR, rCY + Math.sin(a) * rR, 0);
    }
    const spokeGeo = new THREE.BufferGeometry();
    spokeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(spokePts), 3));
    const spokes = new THREE.LineSegments(spokeGeo, lineMat(hdrColor(glass, iF * 0.75, 1.8), 0.65));
    spokes.userData.tag = 'roseSpokes';
    group.add(spokes);
  }

  // ── 8. Flying buttresses
  if (complexity >= 4) {
    const nFb = Math.min(3, Math.floor((complexity - 2) * 0.8));
    for (let i = 0; i < nFb; i++) {
      const frac = (i + 1) / (nFb + 1);
      const sY = py(bY + (nH - bY) * frac);
      for (const [naveX, pierX] of [
        [px(-nHW), px(lTC + tW + 0.04)],
        [px(nHW), px(rTC - tW - 0.04)],
      ] as [number, number][]) {
        const endY = sY - R * 0.14;
        const pts: number[] = [];
        const N = 20;
        for (let k = 0; k <= N; k++) {
          const ti = k / N;
          pts.push(
            lerp(naveX, pierX, ti),
            lerp(sY, endY, ti) + Math.sin(ti * Math.PI) * R * 0.07,
            0,
          );
        }
        addLine(pts, stone, 0.55, 0.6, 'stone');
      }
    }
  }

  // ── 9. Tower lancet windows
  if (complexity >= 4) {
    const nWin = Math.min(3, complexity - 2);
    for (let i = 0; i < nWin; i++) {
      const frac = (i + 1) / (nWin + 1);
      const wY = py(bY + (tH - bY) * frac);
      const wH = R * 0.13;
      const wHW = R * 0.055;
      for (const tc of [lTC, rTC]) {
        gothicArch(px(tc) - wHW, wY, px(tc) + wHW, wY, px(tc), wY + wH, glass, 0.9, 0.85, 'glass');
      }
    }
  }

  // ── 10. Tower pinnacles / crenellations
  if (complexity >= 5) {
    const nCrens = 4;
    const cPts: number[] = [];
    for (const [tl, tr] of [
      [lTC - tW, lTC + tW],
      [rTC - tW, rTC + tW],
    ] as [number, number][]) {
      for (let k = 0; k < nCrens; k++) {
        const x1 = lerp(px(tl), px(tr), k / nCrens);
        const x2 = lerp(px(tl), px(tr), (k + 0.42) / nCrens);
        const x3 = lerp(px(tl), px(tr), (k + 0.58) / nCrens);
        const x4 = lerp(px(tl), px(tr), (k + 1) / nCrens);
        const yB = py(tH);
        const yT = py(tH + 0.045);
        cPts.push(x1, yB, 0, x1, yT, 0, x1, yT, 0, x2, yT, 0, x2, yT, 0, x2, yB, 0);
        cPts.push(x3, yB, 0, x3, yT, 0, x3, yT, 0, x4, yT, 0, x4, yT, 0, x4, yB, 0);
      }
    }
    addSegs(cPts, stone, 0.75, 0.8, 'stone');
  }

  // ── 11. Central spire
  if (complexity >= 6) {
    const sBW = R * 0.085;
    const sBY = py(nH + 0.08);
    const sTY = py(spH);
    const spPts = new Float32Array([
      -sBW,
      sBY,
      0,
      0,
      sTY,
      0,
      0,
      sTY,
      0,
      sBW,
      sBY,
      0,
      -sBW * 0.72,
      sBY + (sTY - sBY) * 0.28,
      0,
      sBW * 0.72,
      sBY + (sTY - sBY) * 0.28,
      0,
      -sBW * 0.44,
      sBY + (sTY - sBY) * 0.56,
      0,
      sBW * 0.44,
      sBY + (sTY - sBY) * 0.56,
      0,
    ]);
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute('position', new THREE.BufferAttribute(spPts, 3));
    const spire = new THREE.LineSegments(spGeo, lineMat(hdrColor(stone, iF * 1.2, 2.3), 1.0));
    spire.userData.tag = 'centralSpire';
    group.add(spire);
  }

  // ── 12. Side aisle pointed arches (decorative)
  if (complexity >= 7) {
    const nArches = 3;
    for (let side = -1; side <= 1; side += 2) {
      const x0 = side < 0 ? lTC + tW : nHW;
      const x1 = side < 0 ? -nHW : rTC - tW;
      for (let i = 0; i < nArches; i++) {
        const frac = i / nArches;
        const ax0 = lerp(px(x0), px(x1), frac);
        const ax1 = lerp(px(x0), px(x1), frac + 1 / nArches);
        const axMid = (ax0 + ax1) * 0.5;
        gothicArch(ax0, py(bY), ax1, py(bY), axMid, py(aH - 0.05), glass, 0.78, 0.72, 'glass');
      }
    }
  }

  return group;
}

function updateSpire(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const breathSpeed = cfg.breathSpeed;
  const breath = (Math.sin(t * 0.001 * breathSpeed) + 1) * 0.5;
  const timeHue = (t * 0.000028) % 1.0;
  const glowFrac = cfg.glow / 10;
  const tmpCol = new THREE.Color();

  // Recompute glass color for update
  const glassH = (glowFrac * 0.35 + timeHue * 0.5 + 0.52) % 1.0;
  tmpCol.setHSL(glassH, 0.88, 0.55);
  const glass: [number, number, number] = [
    lerp(rr, tmpCol.r * 255, glowFrac),
    lerp(gg, tmpCol.g * 255, glowFrac),
    lerp(bb, tmpCol.b * 255, glowFrac),
  ];
  const stone: [number, number, number] = [rr, gg, bb];

  for (const child of group.children) {
    const tag = child.userData.tag as string;

    if (tag === 'roseOuter' || tag === 'roseInner' || tag === 'roseSpokes' || tag === 'glass') {
      // Stained glass: glow pulses and hue shifts
      const glowPulse = 1.0 + breath * 0.35;
      updateMat(child as THREE.Object3D, glass, iF * glowPulse, 2.3);
      if (tag === 'roseOuter') child.rotation.z = t * 0.0001 * breathSpeed;
      if (tag === 'roseInner') child.rotation.z = -t * 0.00015 * breathSpeed;
    } else if (tag === 'centralSpire') {
      const spPulse = 0.9 + breath * 0.2;
      updateMat(child as THREE.Object3D, stone, iF * 1.2 * spPulse, 2.3);
    } else if (tag === 'stone') {
      updateMat(child as THREE.Object3D, stone, iF * (0.68 + breath * 0.16), 1.7);
    }
  }
}

/* ── Background stars ───────────────────────────────────────── */

function buildStars(
  count: number,
  W: number,
  H: number,
  preset = 'Calm Field',
  mode?: Mode,
): THREE.Group {
  const g = new THREE.Group();
  if (count <= 0) return g;
  const pal = PAL[preset] ?? PAL['Calm Field'];
  const isMissionSun = mode === 'missionsun';
  const [rr, gg, bb] = isMissionSun ? PAL['Golden Source'].rgb : pal.rgb;
  const totalN = Math.round(count * (isMissionSun ? 82 : 55) + (isMissionSun ? 90 : 25));
  const half = Math.max(W, H) * 0.62;
  const bandStrength = isMissionSun ? 0 : Math.max(0, (count - 3) / 7);
  const layers = [
    { frac: 0.65, size: 0.8, phase: 0 },
    { frac: 0.28, size: 1.4, phase: 2.1 },
    { frac: 0.07, size: 2.4, phase: 4.3 },
  ];
  for (const layer of layers) {
    const N = Math.round(totalN * layer.frac);
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const inBand = Math.random() < bandStrength * 0.72;
      if (inBand) {
        const along = (Math.random() - 0.5) * 2.35 * half;
        const across = (Math.random() - 0.5) * half * lerp(0.22, 0.08, bandStrength);
        const angle = -0.52;
        pos[i * 3] = along * Math.cos(angle) - across * Math.sin(angle);
        pos[i * 3 + 1] = along * Math.sin(angle) + across * Math.cos(angle);
      } else {
        const halo = isMissionSun && Math.random() < 0.34;
        const a = Math.random() * Math.PI * 2;
        const r = halo ? lerp(0.28, 0.78, Math.random()) * half : Math.random() * half;
        pos[i * 3] = halo ? Math.cos(a) * r : (Math.random() - 0.5) * 2 * half;
        pos[i * 3 + 1] = halo ? Math.sin(a) * r : (Math.random() - 0.5) * 2 * half;
      }
      pos[i * 3 + 2] = isMissionSun ? -80 - Math.random() * 90 : 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(rr / 155, gg / 155, bb / 155),
      size: layer.size,
      sizeAttenuation: false,
      transparent: true,
      opacity: isMissionSun ? 0.18 + layer.frac * 0.08 : 0.22 + bandStrength * 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.userData.tag = 'starLayer';
    pts.userData.phase = layer.phase;
    pts.userData.baseOpacity = isMissionSun ? 0.18 + layer.frac * 0.08 : 0.22 + bandStrength * 0.14;
    g.add(pts);
  }
  return g;
}

function updateStars(group: THREE.Group, t: number): void {
  for (const child of group.children) {
    if (child.userData.tag === 'starLayer') {
      const phase = child.userData.phase as number;
      const baseOpacity = (child.userData.baseOpacity as number | undefined) ?? 0.28;
      if ((child as THREE.Points).material instanceof THREE.PointsMaterial) {
        ((child as THREE.Points).material as THREE.PointsMaterial).opacity =
          baseOpacity + 0.08 * Math.sin(t * 0.00075 + phase);
      }
    }
  }
}

/* ── Slider definitions ─────────────────────────────────────── */

type SliderDef = { key: keyof Cfg; label: string; min: number; max: number; step: number };

const DEFAULT_SLIDERS: SliderDef[] = [
  { key: 'symmetry', label: 'Symmetry', min: 4, max: 24, step: 1 },
  { key: 'complexity', label: 'Complexity', min: 1, max: 10, step: 0.5 },
  { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
  { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
  { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
  { key: 'particles', label: 'Particles', min: 0, max: 10, step: 1 },
  { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
  { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
];

const MODE_SLIDERS: Partial<Record<Mode, SliderDef[]>> = {
  flowfield: [
    { key: 'symmetry', label: 'Gravity Wells', min: 4, max: 24, step: 1 },
    { key: 'complexity', label: 'Turbulence', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Colour Spread', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Flow Speed', min: 0.05, max: 8, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Density', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Dot Size', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  flowwalkers: [
    { key: 'symmetry', label: 'Gravity Wells', min: 4, max: 24, step: 1 },
    { key: 'complexity', label: 'Liquid', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Colour Spread', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Flow Speed', min: 0.05, max: 8, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Density', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Dot Size', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Walkers', min: 1, max: 4, step: 1 },
  ],
  flowsacred: [
    { key: 'symmetry', label: 'Gravity Wells', min: 4, max: 24, step: 1 },
    { key: 'complexity', label: 'Turbulence', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Colour Spread', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Flow Speed', min: 0.05, max: 8, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Density', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Dot Size', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  flowdance: [
    { key: 'symmetry', label: 'Gravity Wells', min: 4, max: 24, step: 1 },
    { key: 'complexity', label: 'Liquid', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Colour Spread', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Flow Speed', min: 0.05, max: 8, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Density', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Dot Size', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  flowsands: [
    { key: 'symmetry', label: 'Gravity Wells', min: 4, max: 24, step: 1 },
    { key: 'complexity', label: 'Turbulence', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Colour Spread', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Flow Speed', min: 0.05, max: 8, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Density', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Dot Size', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  flowbutterfly: [
    { key: 'symmetry', label: 'Gravity Wells', min: 4, max: 24, step: 1 },
    { key: 'complexity', label: 'Liquid', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Colour Spread', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Flow Speed', min: 0.05, max: 8, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Density', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Dot Size', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  flowlines: [
    { key: 'symmetry', label: 'Gravity Wells', min: 4, max: 24, step: 1 },
    { key: 'complexity', label: 'Turbulence', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Colour Spread', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Flow Speed', min: 0.05, max: 8, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Density', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Dot Size', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  lissajous: [
    { key: 'symmetry', label: 'Copies', min: 1, max: 12, step: 1 },
    { key: 'complexity', label: 'Curves', min: 1, max: 6, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.005, max: 1.5, step: 0.005 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
  ],
  lissajous2: [
    { key: 'symmetry', label: 'Copies', min: 1, max: 12, step: 1 },
    { key: 'complexity', label: 'Ratio', min: 1, max: 6, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.005, max: 2.0, step: 0.005 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
  ],
  tunnel: [
    { key: 'symmetry', label: 'Spokes', min: 4, max: 24, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  vitral: [
    { key: 'symmetry', label: 'Cells', min: 4, max: 24, step: 1 },
    { key: 'complexity', label: 'Layers', min: 1, max: 8, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
  ],
  fibonacci: [
    { key: 'complexity', label: 'Arms', min: 1, max: 10, step: 1 },
    { key: 'symmetry', label: 'Rings', min: 2, max: 16, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  clifford: [
    { key: 'complexity', label: 'Density', min: 1, max: 10, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  hypercube: [
    { key: 'complexity', label: 'Fibers', min: 2, max: 20, step: 2 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  lorenz: [
    { key: 'complexity', label: 'Density', min: 1, max: 8, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  knot: [
    { key: 'complexity', label: 'Knot', min: 1, max: 9, step: 1 },
    { key: 'symmetry', label: 'Strands', min: 1, max: 6, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  orbital: [
    { key: 'complexity', label: 'Orbital', min: 1, max: 8, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  geodesic: [
    { key: 'complexity', label: 'Form', min: 1, max: 7, step: 1 },
    { key: 'symmetry', label: 'Shells', min: 1, max: 5, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  rainbow: [
    { key: 'symmetry', label: 'Spokes', min: 0, max: 24, step: 1 },
    { key: 'complexity', label: 'Rings', min: 2, max: 12, step: 1 },
    { key: 'glow', label: 'Rainbow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
  ],
  cathedral: [
    { key: 'symmetry', label: 'Arches', min: 4, max: 16, step: 1 },
    { key: 'complexity', label: 'Height', min: 1, max: 8, step: 1 },
    { key: 'glow', label: 'Colour Mix', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 5, step: 1 },
  ],
  islamic: [
    { key: 'symmetry', label: 'Star Points', min: 6, max: 16, step: 1 },
    { key: 'complexity', label: 'Layers', min: 1, max: 8, step: 1 },
    { key: 'glow', label: 'Colour Mix', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 5, step: 1 },
  ],
  yantra: [
    { key: 'complexity', label: 'Triangle Pairs', min: 2, max: 9, step: 1 },
    { key: 'symmetry', label: 'Lotus Petals', min: 4, max: 16, step: 1 },
    { key: 'glow', label: 'Colour Mix', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 0.8, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
  ],
  celtic: [
    { key: 'complexity', label: 'Knot Count', min: 1, max: 4, step: 1 },
    { key: 'symmetry', label: 'Ring Circle', min: 4, max: 12, step: 1 },
    { key: 'glow', label: 'Colour Mix', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 5, step: 1 },
  ],
  bloom: [
    { key: 'symmetry', label: 'Petals', min: 4, max: 16, step: 1 },
    { key: 'complexity', label: 'Layers', min: 4, max: 12, step: 1 },
    { key: 'glow', label: 'Colour Shift', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Bloom Speed', min: 0.05, max: 1.2, step: 0.05 },
    { key: 'intensity', label: 'Brightness', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  lava: [
    { key: 'complexity', label: 'Blobs', min: 3, max: 8, step: 1 },
    { key: 'glow', label: 'Colour Shift', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Flow Speed', min: 0.05, max: 1.0, step: 0.05 },
    { key: 'intensity', label: 'Brightness', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
  ],
  spire: [
    { key: 'complexity', label: 'Detail Level', min: 1, max: 8, step: 1 },
    { key: 'symmetry', label: 'Rose Spokes', min: 8, max: 24, step: 2 },
    { key: 'glow', label: 'Glass Colour', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 0.8, step: 0.05 },
    { key: 'intensity', label: 'Brightness', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Luminous', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 5, step: 1 },
  ],
  lissajous3d: [
    { key: 'symmetry', label: 'Freq X', min: 1, max: 9, step: 1 },
    { key: 'complexity', label: 'Freq Y', min: 1, max: 9, step: 1 },
    { key: 'glow', label: 'Freq Z', min: 1, max: 9, step: 1 },
    { key: 'particles', label: 'Traces', min: 1, max: 8, step: 1 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  tknot3d: [
    { key: 'symmetry', label: 'Winds P', min: 2, max: 7, step: 1 },
    { key: 'complexity', label: 'Winds Q', min: 2, max: 9, step: 1 },
    { key: 'glow', label: 'Tube', min: 1, max: 10, step: 0.5 },
    { key: 'particles', label: 'Traces', min: 1, max: 6, step: 1 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  lorenz3d: [
    { key: 'symmetry', label: 'Sigma', min: 1, max: 20, step: 1 },
    { key: 'complexity', label: 'Rho', min: 1, max: 20, step: 1 },
    { key: 'glow', label: 'Beta', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Trails', min: 1, max: 6, step: 1 },
    { key: 'breathSpeed', label: 'Flow', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  rose3d: [
    { key: 'symmetry', label: 'Freq A', min: 1, max: 9, step: 1 },
    { key: 'complexity', label: 'Freq B', min: 1, max: 9, step: 1 },
    { key: 'glow', label: 'Freq C', min: 1, max: 9, step: 1 },
    { key: 'particles', label: 'Petals', min: 1, max: 8, step: 1 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  helix3d: [
    { key: 'particles', label: 'Strands', min: 1, max: 8, step: 1 },
    { key: 'symmetry', label: 'Turns', min: 1, max: 12, step: 1 },
    { key: 'complexity', label: 'Bulges', min: 1, max: 10, step: 1 },
    { key: 'glow', label: 'Twist', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  orbital3d: [
    { key: 'symmetry', label: 'Orbits', min: 1, max: 12, step: 1 },
    { key: 'complexity', label: 'Shells', min: 1, max: 6, step: 1 },
    { key: 'glow', label: 'Shape', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Fan', min: 1, max: 8, step: 1 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  kaleidoscope: [
    { key: 'symmetry', label: 'Sides', min: 3, max: 16, step: 1 },
    { key: 'complexity', label: 'Spokes', min: 0, max: 24, step: 1 },
    { key: 'glow', label: 'Rotate', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  warp: [
    { key: 'particles', label: 'Bursts', min: 1, max: 8, step: 1 },
    { key: 'symmetry', label: 'Sparks', min: 4, max: 36, step: 1 },
    { key: 'glow', label: 'Range', min: 1, max: 10, step: 0.5 },
    { key: 'complexity', label: 'Colours', min: 1, max: 10, step: 1 },
    { key: 'breathSpeed', label: 'Speed', min: 0.1, max: 3.0, step: 0.1 },
    { key: 'intensity', label: 'Bright', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  firework3d: [
    { key: 'particles', label: 'Bursts', min: 1, max: 8, step: 1 },
    { key: 'symmetry', label: 'Sparks', min: 4, max: 48, step: 1 },
    { key: 'glow', label: 'Range', min: 1, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.1, max: 3.0, step: 0.1 },
    { key: 'intensity', label: 'Bright', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  fibonacci3d: [
    { key: 'complexity', label: 'Density', min: 1, max: 8, step: 1 },
    { key: 'particles', label: 'Arms', min: 1, max: 8, step: 1 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  yantra3d: [
    { key: 'symmetry', label: 'Shapes', min: 1, max: 12, step: 1 },
    { key: 'complexity', label: 'Layers', min: 1, max: 8, step: 1 },
    { key: 'glow', label: 'Bright', min: 1, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  rainbow3d: [
    { key: 'complexity', label: 'Layers', min: 2, max: 12, step: 1 },
    { key: 'symmetry', label: 'Loops', min: 1, max: 12, step: 1 },
    { key: 'glow', label: 'Ripple', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Bright', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  current3d: [
    { key: 'symmetry', label: 'Turbulence', min: 1, max: 12, step: 1 },
    { key: 'complexity', label: 'Density', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Bright', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],
  matrix: [
    { key: 'complexity', label: 'Tail Length', min: 1, max: 10, step: 1 },
    { key: 'glow', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Density', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],
  pulse: [
    { key: 'symmetry', label: 'Mirror', min: 1, max: 12, step: 1 },
    { key: 'complexity', label: 'Chaos', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Rings', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],
  dotwalker: [
    { key: 'symmetry', label: 'Design 1-5', min: 1, max: 5, step: 1 },
    { key: 'complexity', label: 'Liquid', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Aura Width', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Walk', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Colour', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Walkers 1-4', min: 1, max: 4, step: 1 },
  ],
  missionsun: [
    { key: 'complexity', label: 'Agitation', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Membrane', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Pulse', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Gold', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Dot Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  dotsunfire: [
    { key: 'complexity', label: 'Fire Motion', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Corona', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Pulse', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Heat', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  dotalchemicalsun: [
    { key: 'symmetry', label: 'Rays', min: 5, max: 24, step: 1 },
    { key: 'complexity', label: 'Ray Length', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Ray Curve', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Pulse', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Heat', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  dotheart: [
    { key: 'complexity', label: 'Inner Flow', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Pulse Width', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Pulse', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'intensity', label: 'Warmth', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Stars', min: 0, max: 10, step: 1 },
  ],
  dotphoenix: [
    { key: 'complexity', label: 'Wing Bloom', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Flame Fade', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Loop Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Heat', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Embers', min: 0, max: 10, step: 1 },
  ],
  dotbrain: [
    { key: 'complexity', label: 'Logic / Dream', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Fold Depth', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Loop Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Warmth', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Signals', min: 0, max: 10, step: 1 },
  ],
  neuronweb: [
    { key: 'symmetry', label: 'Cells', min: 5, max: 22, step: 1 },
    { key: 'complexity', label: 'Branching', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Signal Flow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Pulse Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Warmth', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Background', min: 0, max: 10, step: 1 },
  ],

  embrace: [
    { key: 'complexity', label: 'Dance', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Closeness', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Loop Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Warmth', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Aura', min: 0, max: 10, step: 1 },
  ],

  dottunnel: [
    { key: 'symmetry', label: 'Rings', min: 6, max: 28, step: 1 },
    { key: 'complexity', label: 'Depth', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Vanish Point', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Forward Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],
  swirldottunnel: [
    { key: 'symmetry', label: 'Rings', min: 6, max: 28, step: 1 },
    { key: 'complexity', label: 'Swirl', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Vanish Point', min: 0, max: 20, step: 0.5 },
    { key: 'breathSpeed', label: 'Forward Speed', min: 0.05, max: 1.5, step: 0.01 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],
  linetunnel3d: [
    { key: 'symmetry', label: 'Ribs', min: 5, max: 24, step: 1 },
    { key: 'complexity', label: 'Depth', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Curve', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Forward Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],
  dotroad: [
    { key: 'symmetry', label: 'Road Lines', min: 3, max: 12, step: 1 },
    { key: 'complexity', label: 'Perspective', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Horizon', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Drive Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],

  tripnumber1: [
    { key: 'symmetry', label: 'Sacred Count', min: 5, max: 16, step: 1 },
    { key: 'complexity', label: 'Metamorphosis', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Void / Bloom', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Trip Speed', min: 0.05, max: 1.2, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],
  tripnumber2: [
    { key: 'symmetry', label: 'Mirrors', min: 3, max: 14, step: 1 },
    { key: 'complexity', label: 'Desert Chaos', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Heat Colour', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Drop Pulse', min: 0.1, max: 0.3, step: 0.01 },
    { key: 'intensity', label: 'Rings', min: 1, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dust', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],
  tripnumber3: [
    { key: 'symmetry', label: 'Spokes', min: 3, max: 18, step: 1 },
    { key: 'complexity', label: 'Triangle Layers', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Amber Cut', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Yantra Speed', min: 0.2, max: 2.2, step: 0.05 },
    { key: 'intensity', label: 'Line Light', min: 1, max: 10, step: 0.5 },
    { key: 'particles', label: 'Moving Stars', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Depth', min: 0, max: 10, step: 1 },
  ],
  buddhaboycurrents: [
    { key: 'symmetry', label: 'Tide Lanes', min: 4, max: 16, step: 1 },
    { key: 'complexity', label: 'Currents', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Amber Glow', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Breath Speed', min: 0.05, max: 1.8, step: 0.05 },
    { key: 'danceBpm', label: 'BPM', min: 50, max: 180, step: 1 },
    { key: 'danceAmount', label: 'Move Amount', min: 0, max: 10, step: 0.5 },
    { key: 'intensity', label: 'Light', min: 1, max: 10, step: 0.5 },
    { key: 'particles', label: 'Aura', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'stars', label: 'Depth', min: 0, max: 10, step: 1 },
  ],
  touchpreset: [
    { key: 'symmetry', label: 'Swirls', min: 3, max: 18, step: 1 },
    { key: 'complexity', label: 'Liquid Trails', min: 1, max: 10, step: 0.5 },
    { key: 'glow', label: 'Explosion', min: 0, max: 10, step: 0.5 },
    { key: 'breathSpeed', label: 'Trail Speed', min: 0.05, max: 1.5, step: 0.05 },
    { key: 'intensity', label: 'Light', min: 0, max: 10, step: 0.5 },
    { key: 'particles', label: 'Dots', min: 1, max: 10, step: 1 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],

  entropy3d: [
    { key: 'complexity', label: 'Density', min: 1, max: 10, step: 1 },
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
  ],
  embf3d: [
    { key: 'breathSpeed', label: 'Speed', min: 0.05, max: 2.0, step: 0.05 },
    { key: 'glow', label: 'Glow', min: 0, max: 10, step: 0.5 },
    { key: 'intensity', label: 'Colour', min: 1, max: 10, step: 0.5 },
    { key: 'luminous', label: 'Bloom', min: 0, max: 5, step: 0.1 },
    { key: 'complexity', label: 'Density', min: 1, max: 10, step: 1 },
  ],
};

function slidersFor(mode: Mode): SliderDef[] {
  return MODE_SLIDERS[mode] ?? DEFAULT_SLIDERS;
}

/* ── Mode pill definitions ──────────────────────────────────── */

const MODE_TO_PRESET: Partial<Record<Mode, string>> = {
  flowfield: 'Flow Field',
  flowwalkers: 'Flow Walkers',
  flowsacred: 'Flow Sacred',
  flowdance: 'Dance Walkers',
  flowsands: 'Magnetic Sands 2',
  flowbutterfly: 'Butterfly',
  flowlines: 'Star Sand Lines',
  burst: 'DMT Vision',
  kaleidoscope: 'Cosmic Indigo',
  tunnel: 'Warp Tunnel',
  vitral: 'Sacred Vitral',
  fibonacci: 'Fibonacci Bloom',
  clifford: 'Clifford Dream',
  hypercube: '4D Crystal',
  warp: 'Warp Drive',
  lorenz: 'Lorenz Storm',
  knot: 'Knot Garden',
  orbital: 'Orbital Shell',
  geodesic: 'Crystal Lattice',
  rainbow: 'Laser Dome',
  cathedral: 'Sacred Architecture',
  islamic: 'Islamic Garden',
  yantra: 'Yantra Fire',
  celtic: 'Celtic Forest',
  bloom: 'Infinite Bloom',
  lava: 'Lava Dream',
  spire: 'Gothic Spire',
  lissajous3d: 'Lissajous 3D',
  tknot3d: 'Torus Knot',
  lorenz3d: 'Lorenz 3D',
  rose3d: 'Rose 3D',
  helix3d: 'Helix 3D',
  orbital3d: 'Orbital 3D',
  firework3d: 'Firework 3D',
  fibonacci3d: 'Fibonacci 3D',
  yantra3d: 'Yantra 3D',
  rainbow3d: 'Rainbow 3D',
  prism: 'Prism Seed',
  prism3d: 'Prism3D Core',
  liquid: 'Oil Film',
  cells: 'Living Tissue',
  current: 'Ocean Drift',
  currentscales: 'Current Scales',
  cyclonetiles: 'Cyclone Tiles',
  eddylace: 'Eddy Lace',
  magneticsand: 'Magnetic Sand',
  eclipse: 'Eclipse',
  yinyang: 'Yin Yang',
  volcano: 'Volcano',
  atomicexplosion: 'Atomic Explosion',
  gravity: 'Gravity',
  fire: 'Fire',
  plasma: 'Solar Flare',
  nebula: 'Nebula Veil',
  globe: 'Emotion Globe',
  current3d: 'Current 3D',
  matrix: 'Matrix Rain',
  matrix3d: 'Matrix Rain',
  pulse: 'Rorschach Pulse',
  archetypesun: 'Mode Sun',
  braintopography: 'Brain Topography',
  walkingfigure: 'Walking Figure',
  dotwalker: 'Dot Walker',
  missionsun: 'Mission Sun',
  dotsunfire: 'Fire Dot Sun',
  dotsunoutward: 'Outward Sun',
  dotalchemicalsun: 'Alchemical Dot Sun',
  dotheart: 'Dot Heart',
  dotphoenix: 'Dot Phoenix',
  dotbrain: 'Dot Brain Loop',
  neuronweb: 'Neuron Web 1',

  embrace: 'Embrace',

  dottunnel: 'Dot Tunnel',
  swirldottunnel: 'Swirl Dot Tunnel',
  linetunnel3d: 'Line Tunnel 3D',
  dotroad: 'Dot Road',

  tripnumber1: 'Trip Number 1',
  tripnumber2: 'Trip Number 2',
  tripnumber3: 'Trip Number 3',
  buddhaboycurrents: 'Buddha Boy Currents',
  touchpreset: 'Touch Preset',

  embf3d: 'Calm Field',
  wordneon: 'Neon Word',
  hopefear: 'Duality',
  wordecho: 'Echo Word',
  wordparticle: 'Particle Word',
  wordweave: 'Woven Word',
  scriptures: 'Scriptures',
  scripturesjp: 'Vertical Scriptures',
  metamorph: 'Metamorph',
  chrysalis: 'Chrysalis',
  chrysalisrings: 'Chrysalis Rings',
  breathform: 'Breathform',
  clock3d: 'Clock of Infinity',
  atomlight: 'Atom Light',
  pyramid3d: 'Sacred Pyramid',
  orbitdance: 'Orbital Dance',
  ripplemorph: 'Ripple Morph',
  kaleido3d: 'Kaleido Storm',
  mirrortunnel: 'Mirror Tunnel',
  heartwave: 'Heart Wave',
  eyemorph: 'Eye Storm',
  sinmorph3d: 'Sin Morph',
  infinitedive: 'Infinite Dive',
  clockorbit3d: 'Clock Orbit',
  chaostrisphere: 'Chaos Tri Sphere',
};

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'clockorbit3d', label: '⊙³ Clock Orbit' },
  { mode: 'mirrortunnel', label: '⊟ Mirror Tunnel' },
  { mode: 'infinitedive', label: '⊙ Infinite Dive' },
  { mode: 'heartwave', label: '♡ Heart Wave' },
  { mode: 'eyemorph', label: '◉ Eye Morph' },
  { mode: 'sinmorph3d', label: '∿³ Sin Morph' },
  { mode: 'clock3d', label: '⊙ Clock' },
  { mode: 'atomlight', label: '⊛ Atom Light' },
  { mode: 'pyramid3d', label: '△ Pyramid' },
  { mode: 'orbitdance', label: '◎ Orbit Dance' },
  { mode: 'ripplemorph', label: '∿ Ripple Morph' },
  { mode: 'kaleido3d', label: '⬡ Kaleido' },
  { mode: 'wordneon', label: '✦ Neon Word' },
  { mode: 'hopefear', label: '◈ Duality' },
  { mode: 'wordecho', label: '◉ Echo Word' },
  { mode: 'wordparticle', label: '✤ Particle Word' },
  { mode: 'wordweave', label: '∾ Woven Word' },
  { mode: 'scriptures', label: 'Scriptures' },
  { mode: 'scripturesjp', label: 'Vertical Scriptures' },
  { mode: 'metamorph', label: '∞ Metamorph' },
  { mode: 'chrysalis', label: '◈ Chrysalis' },
  { mode: 'chrysalisrings', label: 'Chrysalis Rings' },
  { mode: 'breathform', label: '◉ Breathform' },
  { mode: 'lissajous', label: '∿ Lissajous' },
  { mode: 'lissajous2', label: '∿ Expand' },
  { mode: 'lissajous3d', label: '∿³ Lissajous 3D' },
  { mode: 'yantra3d', label: '△ Yantra 3D' },
  { mode: 'rainbow', label: '◉ Rainbow' },
  { mode: 'geodesic', label: '⬡ Geodesic' },
  { mode: 'sacred', label: '✦ Sacred' },
  { mode: 'burst', label: '✤ Burst' },
  { mode: 'golden', label: 'φ Golden' },
  { mode: 'kaleidoscope', label: '⬡ Kaleidoscope' },
  { mode: 'torus', label: '◎ Torus' },
  { mode: 'tunnel', label: '⊙ Tunnel' },
  { mode: 'vitral', label: '✧ Vitral' },
  { mode: 'fibonacci', label: 'φ² Fibonacci' },
  { mode: 'clifford', label: '∞ Clifford' },
  { mode: 'hypercube', label: '◈ Hypercube' },
  { mode: 'warp', label: '🎆 Firework' },
  { mode: 'lorenz', label: '𝛔 Lorenz' },
  { mode: 'knot', label: '∮ Knot' },
  { mode: 'orbital', label: '⊛ Orbital' },
  { mode: 'cathedral', label: '⛪ Cathedral' },
  { mode: 'islamic', label: '☪ Islamic' },
  { mode: 'yantra', label: '△ Yantra' },
  { mode: 'celtic', label: '☘ Celtic' },
  { mode: 'bloom', label: '🌸 Bloom' },
  { mode: 'lava', label: '🌋 Lava' },
  { mode: 'spire', label: '⛪ Spire' },
  { mode: 'tknot3d', label: '⌀ Torus Knot' },
  { mode: 'lorenz3d', label: '𝛔 Lorenz 3D' },
  { mode: 'rose3d', label: '✾ Rose 3D' },
  { mode: 'helix3d', label: '⟳ Helix 3D' },
  { mode: 'orbital3d', label: '⊛ Orbital 3D' },
  { mode: 'firework3d', label: '🎆 Firework 3D' },
  { mode: 'fibonacci3d', label: 'φ Fibonacci 3D' },
  { mode: 'rainbow3d', label: '◉ Rainbow 3D' },
  { mode: 'prism', label: '◇ Prism' },
  { mode: 'prism3d', label: '◈ Prism 3D' },
  { mode: 'liquid', label: '〰 Liquid' },
  { mode: 'cells', label: '⬡ Cells' },
  { mode: 'current', label: '∿ Current' },
  { mode: 'currentscales', label: 'Current Scales' },
  { mode: 'cyclonetiles', label: 'Cyclone Tiles' },
  { mode: 'eddylace', label: 'Eddy Lace' },
  { mode: 'magneticsand', label: 'Magnetic Sand' },
  { mode: 'flowfield', label: 'Flow Field' },
  { mode: 'flowwalkers', label: 'Flow Walkers' },
  { mode: 'flowsacred', label: 'Flow Sacred' },
  { mode: 'flowdance', label: 'Dance Walkers' },
  { mode: 'flowsands', label: 'Magnetic Sands 2' },
  { mode: 'flowbutterfly', label: 'Butterfly' },
  { mode: 'flowlines', label: 'Star Sand Lines' },
  { mode: 'eclipse', label: 'Eclipse' },
  { mode: 'yinyang', label: 'Yin Yang' },
  { mode: 'volcano', label: 'Volcano' },
  { mode: 'atomicexplosion', label: 'Atomic Explosion' },
  { mode: 'gravity', label: 'Gravity' },
  { mode: 'fire', label: 'Fire' },
  { mode: 'current3d', label: '∿³ Current 3D' },
  { mode: 'plasma', label: '☀ Plasma' },
  { mode: 'nebula', label: 'Nebula' },

  { mode: 'globe', label: '◎ Globe' },
  { mode: 'matrix', label: '⋮ Matrix' },
  { mode: 'matrix3d', label: '⋮³ Matrix 3D' },
  { mode: 'archetypesun', label: 'Mode Sun' },
  { mode: 'braintopography', label: 'Brain Topography' },
  { mode: 'walkingfigure', label: 'Walking Figure' },
  { mode: 'dotwalker', label: 'Dot Walker' },
  { mode: 'missionsun', label: 'Mission Sun' },
  { mode: 'dotsunfire', label: 'Fire Dot Sun' },
  { mode: 'dotsunoutward', label: 'Outward Sun' },
  { mode: 'dotalchemicalsun', label: 'Alchemical Dot Sun' },
  { mode: 'dotheart', label: 'Dot Heart' },
  { mode: 'dotphoenix', label: 'Dot Phoenix' },
  { mode: 'dotbrain', label: 'Dot Brain Loop' },
  { mode: 'neuronweb', label: 'Neuron Web' },

  { mode: 'embrace', label: 'Embrace' },

  { mode: 'dottunnel', label: 'Dot Tunnel' },
  { mode: 'swirldottunnel', label: 'Swirl Dot Tunnel' },
  { mode: 'linetunnel3d', label: 'Line Tunnel 3D' },
  { mode: 'dotroad', label: 'Dot Road' },

  { mode: 'tripnumber1', label: 'Trip Number 1' },
  { mode: 'tripnumber2', label: 'Trip Number 2' },
  { mode: 'tripnumber3', label: 'Trip Number 3' },
  { mode: 'buddhaboycurrents', label: 'Buddha Boy Currents' },
  { mode: 'touchpreset', label: 'Touch Preset' },

  { mode: 'pulse', label: '◉ Pulse' },
  { mode: 'emotion', label: '◉ Emotion' },
  { mode: 'constellation', label: '✦ Constellation' },
  { mode: 'drift', label: '∿ Drift' },
  { mode: 'cbloom', label: '⊛ Bloom Evo' },
  { mode: 'orbit', label: '◎ Orbit' },
  { mode: 'weave', label: '∾ Weave' },
  { mode: 'chaostrisphere', label: 'Chaos Tri Sphere' },
  { mode: 'chaostri3d', label: '△ Chaos Tri 3D' },
  { mode: 'treeoflife', label: '✦ Tree of Life' },
  { mode: 'treeoflife3d', label: '✦³ Tree 3D' },
  { mode: 'breath', label: '◉ Breath' },
  { mode: 'stream', label: '∿ Stream' },
  { mode: 'entropy', label: '⋮ Entropy' },
  { mode: 'entropy3d', label: '⋮³ Entropy 3D' },
  { mode: 'embf3d', label: '◎ EMBF 3D' },
];

type FeaturedItem = { name: string; tag: string } | { header: string; dim?: boolean };

export const FEATURED_PRESETS: FeaturedItem[] = [
  { header: 'Good Ones' },
  { name: 'Magnetic Sand', tag: 'CURRENT' },
  { name: 'Dot Walker', tag: 'CHAR' },
  { name: 'Trip Number 1', tag: 'TRIP' },
  { name: 'Trip Number 2', tag: 'DROP' },
  { name: 'Trip Number 3', tag: 'TRI' },
  { name: 'Flow Field', tag: 'FLOW' },
  { name: 'Flow Sacred', tag: 'FLOW' },
  { name: 'Magnetic Sands 2', tag: 'FLOW' },
  { name: 'Butterfly', tag: 'FLOW' },
  { name: 'Golden Flow', tag: 'FLOW' },
  { name: 'Gravity', tag: 'TOP' },
  { name: 'Fire', tag: 'TOP' },
  { name: 'Prism3D Core', tag: 'PRISM' },
  { name: 'Prism Bloom', tag: 'PRISM' },
  { name: 'Prism Seed', tag: 'PRISM' },
  { name: 'Cathedral Glass', tag: 'GLASS' },
  { name: 'Clock Orbit', tag: 'CLOCK' },
  { name: 'Ocean Drift', tag: 'CURRENT' },
  { name: 'Current 3D', tag: 'CURRENT' },
  { name: 'Current Scales', tag: 'CURRENT' },
  { name: 'Cyclone Tiles', tag: 'CURRENT' },
  { name: 'Eddy Lace', tag: 'CURRENT' },
  { name: 'Mission Sun', tag: 'VOICE' },
  { name: 'Fire Dot Sun', tag: 'DOT' },
  { name: 'Dot Heart', tag: 'DOT' },
  { name: 'Dot Phoenix', tag: 'DOT' },
  { name: 'Dot Brain Loop', tag: 'DOT' },
  { name: 'Neuron Web 1', tag: 'NEURON' },
  { name: 'Neuron Web 2', tag: 'NEURON' },
  { name: 'Neuron Web 3', tag: 'NEURON' },
  { name: 'Neuron Web 4', tag: 'NEURON' },
  { name: 'Neuron Web 5', tag: 'NEURON' },
  { name: 'Swirl Dot Tunnel', tag: 'DEPTH' },
  { name: 'Dot Road', tag: 'ROAD' },

  { name: 'Touch Preset', tag: 'TOUCH' },

  { name: 'Outward Sun', tag: 'DOT' },
  { name: 'Chaos Field', tag: 'CHAOS' },
  { name: 'Quantum Chaos', tag: 'CHAOS' },
  { name: 'Chaos Triangles', tag: '3D' },
  { name: 'Chaos Tri Sphere', tag: '3D' },
  { name: 'Alchemical Dot Sun', tag: 'DOT' },
  { name: 'Sin Morph', tag: 'TOP' },
  { name: 'Chaos Sin Morph', tag: 'MUSIC' },
  { name: 'Drift Field', tag: 'MUSIC' },
  { name: 'Sacred Pyramid', tag: 'MUSIC' },
  { name: 'Focus Arc', tag: 'MUSIC' },
  { name: 'Yantra 3D', tag: 'YANTRA' },
  { name: 'Yantra Prism', tag: 'YANTRA' },
  { name: 'Yantra Colour', tag: 'YANTRA' },
  { name: 'Yantra Mono', tag: 'YANTRA' },
  { name: 'Chaos Pulse', tag: 'CHAOS' },
  { name: 'Chaos Tri Gold', tag: '3D' },
  { name: 'Chaos Storm 3D', tag: '3D' },
  { name: 'Drift Gold', tag: 'FLOW' },
  { name: 'Vortex 3D', tag: 'FLOW' },
  { name: 'Deep Flow 3D', tag: 'FLOW' },
  { name: 'Plasma Field', tag: 'FLOW' },
  { name: 'Solar Flare', tag: 'FLOW' },
  { name: 'Emotion Storm', tag: 'SELF' },
  { name: 'Star Map', tag: 'SELF' },
  { name: 'Constellation Gold', tag: 'SELF' },
  { name: 'Mind Current', tag: 'SELF' },
  { name: 'Soul Map', tag: 'SELF' },
  { name: 'Body Flow', tag: 'SELF' },
  { name: 'Inner Temple', tag: 'SELF' },
  { name: '4D Crystal', tag: '3D' },
  { name: 'Celtic Forest', tag: '3D' },
  { name: 'Torus Knot', tag: '3D' },
  { name: 'Rose 3D', tag: '3D' },
  { name: 'Helix 3D', tag: '3D' },
  { name: 'Orbital 3D', tag: '3D' },
  { name: 'Armillary Gold', tag: 'CLOCK' },
  { name: 'Ripple Morph', tag: 'MORPH' },
  { name: 'EMBF Live', tag: 'EMBF' },
  { name: 'Entropy 3D', tag: 'CORE' },
  { name: 'Embrace', tag: 'DOT' },
  { name: 'Dot Tunnel', tag: 'DEPTH' },
  { name: 'Random Burst', tag: 'CHAOS' },
  { name: 'Starflow Galaxy', tag: 'MUSIC' },
  { header: 'In Progress / To Develop', dim: true },
  { name: 'Chrysalis', tag: 'MORPH' },
  { name: 'Metamorph', tag: 'MORPH' },
  { name: 'Mirror Tunnel', tag: 'DEPTH' },
  { name: 'Infinite Dive', tag: 'DEPTH' },
  { name: 'Kaleido Storm', tag: 'KALEIDO' },
  { name: 'Sacred Vitral', tag: 'VITRAL' },
  { name: 'Oil Film', tag: 'LIQUID' },
  { name: 'Living Tissue', tag: 'CELLS' },
  { name: 'Tree of Life', tag: 'TREE' },
  { name: 'Tangka Lotus', tag: 'TIB' },
  { name: 'Matrix Rain', tag: 'DOT' },
  // Moved here from Good Ones on 3 Oct 2026: the trip is not finished yet.
  { name: 'Star Sand Lines', tag: 'FLOW' },
];

// Diaporama — a generated "play all" program: every featured preset in list
// order (up to #76), each carrying its own config, looping forever. The journey
// engine crossfades between slides so it never hard-cuts, and the builder's
// sliders adapt to each stage's mode as it plays. Pushed onto JOURNEYS so it
// appears in the Journeys tab like any other program.
// Slow + calm: each slide holds ~a minute, and every preset's animation speed
// is capped so nothing races by — it should drift, not flicker. A few presets
// are skipped so the loop stays on the ones worth lingering on.
const DIAPORAMA_SLIDE_SEC = 60;
const DIAPORAMA_MAX_SPEED = 0.18;
const DIAPORAMA_SKIP = new Set([
  'Sacred Sin Morph',
  'Chaos Sin Morph',
  'Drift Field',
  'Sacred Pyramid',
]);
const DIAPORAMA_STAGES: JourneyStage[] = FEATURED_PRESETS.flatMap((item) => {
  if (!('name' in item)) return [];
  if (DIAPORAMA_SKIP.has(item.name)) return [];
  const p = PRESETS[item.name];
  if (!p) return [];
  return [
    {
      name: item.name,
      preset: p.preset,
      mode: p.mode,
      duration: DIAPORAMA_SLIDE_SEC,
      symmetry: p.symmetry,
      complexity: p.complexity,
      glow: p.glow,
      breathSpeed: Math.min(p.breathSpeed ?? DIAPORAMA_MAX_SPEED, DIAPORAMA_MAX_SPEED),
      intensity: p.intensity,
      particles: p.particles,
      luminous: p.luminous,
      stars: p.stars,
    },
  ];
}).slice(0, 76);

JOURNEYS.push({
  id: JOURNEYS.length + 1,
  name: 'Diaporama — Play All',
  icon: 'ALL',
  desc: `Every preset, one after another — the whole library as a slideshow, up to #${DIAPORAMA_STAGES.length}, looping forever. Slow and calm: ~${Math.round((DIAPORAMA_STAGES.length * DIAPORAMA_SLIDE_SEC) / 60)} minutes at ${DIAPORAMA_SLIDE_SEC}s a slide; the sliders adapt to each stage as it plays.`,
  stages: DIAPORAMA_STAGES,
});

/* ── Finger distortion (module-level, single-instance) ───────── */
let _distortActive = false;
let _distortWorldX = 0;
let _distortWorldY = 0;
let _distortMode: FingerMode = 'off';
let _musicPulse = 0;
let _musicBass = 0;
let _musicDrums = 0;
let _musicPads = 0;
let _musicKeys = 0;
let _musicLead = 0;
let _musicBpm = 122;
let _voiceEnergy = 0;
let _currentScalePulse = 0.72;
let _currentScaleBass = 0.62;
let _currentScaleFlow = 0.68;
let _currentScaleColour = 0.28;
let _currentScaleGeometry = 0.58;
let _currentScaleWings = 0.46;
let _currentScaleShape = 'scales';
let _rippleRingsVisible = false;
let _galaxyImpact = 0.64;
let _galaxyGravity = 0.7;
let _galaxyArms = 0.72;
let _galaxyHaze = 0.58;
let _galaxySparks = 0.52;
let _galaxyDepth = 0.42;
let _galaxyShape = 'galaxy';

function fingerForce(
  x: number,
  y: number,
  z: number,
  base: number,
): { x: number; y: number; z: number; glow: number } {
  if (!_distortActive || _distortMode === 'off') return { x: 0, y: 0, z: 0, glow: 0 };
  const dx = x - _distortWorldX;
  const dy = y - _distortWorldY;
  const d2 = dx * dx + dy * dy + z * z * 0.35 + 6;
  const d = Math.sqrt(d2);
  const falloff = Math.min(1, (base * base) / d2);
  const sign = _distortMode === 'pull' ? -1 : 1;
  const strength =
    _distortMode === 'light' ? base * 0.015 * falloff : base * 0.028 * falloff * sign;
  if (_distortMode === 'ripple') {
    const wave = Math.sin(d * 0.09 - performance.now() * 0.012) * base * 0.012 * falloff;
    return { x: (dx / d) * wave, y: (dy / d) * wave, z: (z / d) * wave * 0.5, glow: falloff };
  }
  if (_distortMode === 'light') return { x: 0, y: 0, z: 0, glow: falloff };
  return {
    x: (dx / d) * strength,
    y: (dy / d) * strength,
    z: (z / d) * strength * 0.35,
    glow: falloff,
  };
}

/* ── PULSE mode — rorschach pulsing rings ────────────────────── */

/* Archetype Sun - radiating compass for inner modes */

const ARCHETYPE_SUN_NAMES = [
  'creation',
  'organisation',
  'admin',
  'builder',
  'body',
  'reflection',
  'child',
];
const ARCHETYPE_SUN_PTS = 160;

function readArchetypeSunState() {
  if (typeof window === 'undefined') return { active: 'creation', avoided: 'admin' };
  try {
    return {
      active: window.localStorage.getItem('colourmap:archetype-active') ?? 'creation',
      avoided: window.localStorage.getItem('colourmap:archetype-avoided') ?? 'admin',
    };
  } catch {
    return { active: 'creation', avoided: 'admin' };
  }
}

function buildArchetypeSun(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const iF = cfg.intensity / 10;
  const [rr, gg, bb] = pal.rgb;

  const rayGeo = new THREE.BufferGeometry();
  const rayPos = new Float32Array(ARCHETYPE_SUN_NAMES.length * 2 * 3);
  rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPos, 3));
  const rays = new THREE.LineSegments(rayGeo, lineMat(hdrColor([rr, gg, bb], iF, 2.3), 1));
  rays.userData.tag = 'archetypeSunRays';
  group.add(rays);

  const nodeGeo = new THREE.BufferGeometry();
  const nodePos = new Float32Array(ARCHETYPE_SUN_NAMES.length * 3);
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
  const nodes = new THREE.Points(nodeGeo, ptsMat(hdrColor([rr, gg, bb], iF, 2.8), 6, 0.9));
  nodes.userData.tag = 'archetypeSunNodes';
  group.add(nodes);

  for (let ri = 0; ri < 4; ri++) {
    const ringGeo = new THREE.BufferGeometry();
    const ringPos = new Float32Array((ARCHETYPE_SUN_PTS + 1) * 3);
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
    const ring = new THREE.Line(ringGeo, lineMat(hdrColor([rr, gg, bb], iF * 0.45, 1.7), 0.42));
    ring.userData.tag = 'archetypeSunRing';
    ring.userData.ri = ri;
    group.add(ring);
  }

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.1, 72),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(rr / 255, gg / 255, bb / 255),
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
    }),
  );
  core.userData.tag = 'archetypeSunCore';
  group.add(core);

  return group;
}

function updateArchetypeSun(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const baseRgb = pal.rgb;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed;
  const { active, avoided } = readArchetypeSunState();
  const activeIdx = Math.max(0, ARCHETYPE_SUN_NAMES.indexOf(active));
  const avoidedIdx = Math.max(0, ARCHETYPE_SUN_NAMES.indexOf(avoided));
  const TAU = Math.PI * 2;
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.0012 * speed);
  const flow = 0.5 + 0.5 * Math.sin(t * 0.00055 * speed + 1.4);

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'archetypeSunRays') {
      const lines = child as THREE.LineSegments;
      const arr = (lines.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      for (let i = 0; i < ARCHETYPE_SUN_NAMES.length; i++) {
        const a = (i / ARCHETYPE_SUN_NAMES.length) * TAU - Math.PI / 2;
        const isActive = i === activeIdx;
        const isAvoided = i === avoidedIdx;
        const strength = isActive ? 1 : isAvoided ? 0.42 + flow * 0.18 : 0.62;
        const inner = R * (0.13 + pulse * 0.018);
        const outer = R * (0.42 + strength * 0.38 + Math.sin(t * 0.0009 + i) * 0.018);
        const base = i * 6;
        arr[base] = Math.cos(a) * inner;
        arr[base + 1] = Math.sin(a) * inner;
        arr[base + 2] = 0;
        arr[base + 3] = Math.cos(a) * outer;
        arr[base + 4] = Math.sin(a) * outer;
        arr[base + 5] = 0;
      }
      (lines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      updateMat(lines, baseRgb, iF * (0.54 + pulse * 0.2), 2.5 + glowF);
    } else if (tag === 'archetypeSunNodes') {
      const pts = child as THREE.Points;
      const arr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      for (let i = 0; i < ARCHETYPE_SUN_NAMES.length; i++) {
        const a = (i / ARCHETYPE_SUN_NAMES.length) * TAU - Math.PI / 2;
        const isActive = i === activeIdx;
        const isAvoided = i === avoidedIdx;
        const r = R * (isActive ? 0.82 + pulse * 0.04 : isAvoided ? 0.58 + flow * 0.06 : 0.68);
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = Math.sin(a) * r;
        arr[i * 3 + 2] = isActive ? R * 0.02 : 0;
      }
      (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = (5.5 + pulse * 2.2) * (R / 260);
      mat.opacity = 0.72 + pulse * 0.18;
      updateMat(pts, baseRgb, iF, 3.1 + glowF);
    } else if (tag === 'archetypeSunRing') {
      const ring = child as THREE.Line;
      const ri = child.userData.ri as number;
      const arr = (ring.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      const ringR = R * (0.18 + ri * 0.16 + pulse * 0.012 * (ri + 1));
      for (let p = 0; p <= ARCHETYPE_SUN_PTS; p++) {
        const a = (p / ARCHETYPE_SUN_PTS) * TAU;
        const wave =
          1 +
          Math.sin(a * 6 + t * 0.001 * speed + ri) * 0.018 * cfg.complexity +
          Math.sin(a * 3 - t * 0.0006 * speed) * 0.012 * cfg.symmetry;
        arr[p * 3] = Math.cos(a) * ringR * wave;
        arr[p * 3 + 1] = Math.sin(a) * ringR * wave;
        arr[p * 3 + 2] = 0;
      }
      (ring.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      updateMat(ring, baseRgb, iF * (0.24 + ri * 0.08), 1.8 + glowF);
    } else if (tag === 'archetypeSunCore') {
      const core = child as THREE.Mesh;
      core.scale.setScalar(1 + pulse * 0.18 + flow * 0.04);
      const mat = core.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.34 + pulse * 0.22;
      mat.color.setRGB(baseRgb[0] / 255, baseRgb[1] / 255, baseRgb[2] / 255);
    }
  }
}

/* Brain Topography - thousand-dot walnut field for future living maps */

const BRAIN_DOT_COUNT = 1800;
const BRAIN_RIDGE_PTS = 260;

function brainRadius(a: number, side: number, cfg: Cfg, t = 0) {
  const folded =
    1 +
    0.08 * Math.sin(a * 3 + side * 0.4) +
    0.045 * Math.sin(a * 7 - side * 0.7 + t * 0.0004 * cfg.breathSpeed) +
    0.025 * Math.cos(a * 13 + t * 0.0002);
  const crown = 1 - 0.11 * Math.max(0, Math.cos(a - Math.PI / 2));
  return folded * crown;
}

function buildBrainTopography(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const iF = cfg.intensity / 10;
  const count = BRAIN_DOT_COUNT;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;
    const golden = i * 2.399963229728653;
    const side = i % 2 === 0 ? -1 : 1;
    const a = golden;
    const rr = Math.sqrt(u) * R * 0.78;
    const x = Math.cos(a) * rr * 0.74 + side * R * 0.22;
    const y = Math.sin(a) * rr * 0.94;
    const nx = (x - side * R * 0.22) / (R * 0.74);
    const ny = y / (R * 0.94);
    const edge = Math.sqrt(nx * nx + ny * ny);
    const foldedEdge = brainRadius(Math.atan2(ny, nx), side, cfg);
    const inside = edge <= foldedEdge ? 1 : foldedEdge / Math.max(0.001, edge);
    seed[i * 3] = x * inside;
    seed[i * 3 + 1] = y * inside;
    seed[i * 3 + 2] = side;
    pos[i * 3] = seed[i * 3];
    pos[i * 3 + 1] = seed[i * 3 + 1];
    pos[i * 3 + 2] = 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
  const dots = new THREE.Points(geo, ptsMat(hdrColor(pal.rgb, iF, 2.8), 2.4, 0.78));
  dots.userData.tag = 'brainDots';
  group.add(dots);

  for (const side of [-1, 1]) {
    const outlineGeo = new THREE.BufferGeometry();
    outlineGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array((BRAIN_RIDGE_PTS + 1) * 3), 3),
    );
    const outline = new THREE.Line(outlineGeo, lineMat(hdrColor(pal.rgb, iF * 0.5, 2.1), 0.55));
    outline.userData.tag = 'brainOutline';
    outline.userData.side = side;
    group.add(outline);

    for (let ridge = 0; ridge < 6; ridge++) {
      const ridgeGeo = new THREE.BufferGeometry();
      ridgeGeo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(BRAIN_RIDGE_PTS * 3), 3),
      );
      const line = new THREE.Line(ridgeGeo, lineMat(hdrColor(pal.rgb, iF * 0.34, 1.9), 0.28));
      line.userData.tag = 'brainRidge';
      line.userData.side = side;
      line.userData.ridge = ridge;
      group.add(line);
    }
  }

  const midGeo = new THREE.BufferGeometry();
  midGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(BRAIN_RIDGE_PTS * 3), 3),
  );
  const mid = new THREE.Line(midGeo, lineMat(hdrColor(pal.rgb, iF * 0.42, 2.1), 0.42));
  mid.userData.tag = 'brainMiddle';
  group.add(mid);

  return group;
}

function updateBrainTopography(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const iF = cfg.intensity / 10;
  const speed = cfg.breathSpeed;
  const TAU = Math.PI * 2;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'brainDots') {
      const dots = child as THREE.Points;
      const pos = dots.geometry.getAttribute('position') as THREE.BufferAttribute;
      const seed = dots.geometry.getAttribute('seed') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const sarr = seed.array as Float32Array;
      for (let i = 0; i < BRAIN_DOT_COUNT; i++) {
        const bx = sarr[i * 3];
        const by = sarr[i * 3 + 1];
        const side = sarr[i * 3 + 2];
        const a = Math.atan2(by, bx - side * R * 0.22);
        const d = Math.hypot(bx / R, by / R);
        const wave =
          Math.sin(a * cfg.symmetry + d * 10 + t * 0.001 * speed) * R * 0.018 +
          Math.cos((bx * 0.02 + by * 0.013) * cfg.complexity + t * 0.0007) * R * 0.012;
        const braid = Math.sin((bx * side + by * 0.55) * 0.035 + t * 0.0012 * speed) * R * 0.012;
        const force = fingerForce(bx, by, 0, R);
        arr[i * 3] = bx + Math.cos(a) * wave + side * braid + force.x;
        arr[i * 3 + 1] = by + Math.sin(a * 2) * wave * 0.5 + braid * 0.35 + force.y;
        arr[i * 3 + 2] = force.z;
      }
      pos.needsUpdate = true;
      const mat = dots.material as THREE.PointsMaterial;
      mat.size = (1.6 + cfg.particles * 0.22) * (R / 260);
      mat.opacity = 0.62 + Math.min(0.25, cfg.glow / 44);
      updateMat(dots, pal.rgb, iF, 2.3 + cfg.luminous * 0.28);
    } else if (tag === 'brainOutline') {
      const line = child as THREE.Line;
      const side = child.userData.side as number;
      const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let p = 0; p <= BRAIN_RIDGE_PTS; p++) {
        const a = (p / BRAIN_RIDGE_PTS) * TAU;
        const rr = brainRadius(a, side, cfg, t);
        arr[p * 3] = side * R * 0.22 + Math.cos(a) * R * 0.74 * rr;
        arr[p * 3 + 1] = Math.sin(a) * R * 0.94 * rr;
        arr[p * 3 + 2] = 0;
      }
      pos.needsUpdate = true;
      updateMat(line, pal.rgb, iF * 0.36, 2.1);
    } else if (tag === 'brainRidge') {
      const line = child as THREE.Line;
      const side = child.userData.side as number;
      const ridge = child.userData.ridge as number;
      const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const lane = -0.72 + ridge * 0.29;
      for (let p = 0; p < BRAIN_RIDGE_PTS; p++) {
        const q = p / (BRAIN_RIDGE_PTS - 1);
        const y = (q - 0.5) * R * 1.55;
        const curve = Math.sin(q * Math.PI) * R * 0.28;
        const fold =
          Math.sin(q * Math.PI * (2.2 + ridge * 0.2) + t * 0.0009 * speed + ridge) * R * 0.05;
        arr[p * 3] = side * (R * 0.2 + curve * (0.35 + ridge * 0.05)) + lane * R * 0.08 + fold;
        arr[p * 3 + 1] = y;
        arr[p * 3 + 2] = 0;
      }
      pos.needsUpdate = true;
      updateMat(line, pal.rgb, iF * 0.22, 1.8);
    } else if (tag === 'brainMiddle') {
      const line = child as THREE.Line;
      const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let p = 0; p < BRAIN_RIDGE_PTS; p++) {
        const q = p / (BRAIN_RIDGE_PTS - 1);
        const y = (q - 0.5) * R * 1.56;
        arr[p * 3] = Math.sin(q * Math.PI * 8 + t * 0.0008 * speed) * R * 0.018;
        arr[p * 3 + 1] = y;
        arr[p * 3 + 2] = 0;
      }
      pos.needsUpdate = true;
      updateMat(line, pal.rgb, iF * 0.28, 2.1);
    }
  }
}

/* Walking Figure - sober starfish-human loop for future character language */

function capsuleLine(name: string, color: THREE.Color, opacity: number, width = 1) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: width }),
  );
  line.userData.tag = 'figureLimb';
  line.userData.name = name;
  return line;
}

function makeJoint(name: string, R: number, color: THREE.Color, opacity: number) {
  const joint = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.022, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide }),
  );
  joint.userData.tag = 'figureJoint';
  joint.userData.name = name;
  return joint;
}

function buildWalkingFigure(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const color = hdrColor(pal.rgb, cfg.intensity / 10, 2.2);
  const soft = hdrColor(pal.rgb, cfg.intensity / 10, 1.35);

  for (const name of ['spine', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'ground']) {
    group.add(capsuleLine(name, name === 'ground' ? soft : color, name === 'ground' ? 0.28 : 0.72));
  }

  const head = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.095, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  head.userData.tag = 'figureHead';
  group.add(head);

  for (const name of ['chest', 'pelvis', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot']) {
    group.add(makeJoint(name, R, color, 0.56));
  }

  const auraGeo = new THREE.BufferGeometry();
  auraGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(180 * 3), 3));
  const aura = new THREE.Line(auraGeo, lineMat(soft, 0.22));
  aura.userData.tag = 'figureAura';
  group.add(aura);

  return group;
}

function setLine(line: THREE.Line, ax: number, ay: number, bx: number, by: number) {
  const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  arr[0] = ax;
  arr[1] = ay;
  arr[2] = 0;
  arr[3] = bx;
  arr[4] = by;
  arr[5] = 0;
  pos.needsUpdate = true;
}

function updateWalkingFigure(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const color = hdrColor(pal.rgb, cfg.intensity / 10, 2.2 + cfg.luminous * 0.16);
  const phase = t * 0.0032 * cfg.breathSpeed;
  const walk = Math.sin(phase);
  const counter = Math.sin(phase + Math.PI);
  const bob = Math.sin(phase * 2) * R * 0.018;
  const sway = Math.sin(phase) * R * 0.022;

  const chest = { x: sway, y: R * 0.14 + bob };
  const pelvis = { x: -sway * 0.5, y: -R * 0.18 + bob * 0.3 };
  const neck = { x: chest.x * 0.45, y: R * 0.31 + bob };
  const head = { x: neck.x + sway * 0.32, y: R * 0.45 + bob };
  const lHand = { x: -R * (0.29 + walk * 0.05), y: R * (0.04 - walk * 0.12) + bob };
  const rHand = { x: R * (0.29 + counter * 0.05), y: R * (0.04 - counter * 0.12) + bob };
  const lFoot = { x: -R * (0.16 + counter * 0.13), y: -R * 0.58 + Math.max(0, counter) * R * 0.07 };
  const rFoot = { x: R * (0.16 + walk * 0.13), y: -R * 0.58 + Math.max(0, walk) * R * 0.07 };

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'figureLimb') {
      const line = child as THREE.Line;
      const name = child.userData.name as string;
      if (name === 'spine') setLine(line, neck.x, neck.y, pelvis.x, pelvis.y);
      if (name === 'leftArm') setLine(line, chest.x - R * 0.055, chest.y, lHand.x, lHand.y);
      if (name === 'rightArm') setLine(line, chest.x + R * 0.055, chest.y, rHand.x, rHand.y);
      if (name === 'leftLeg') setLine(line, pelvis.x - R * 0.045, pelvis.y, lFoot.x, lFoot.y);
      if (name === 'rightLeg') setLine(line, pelvis.x + R * 0.045, pelvis.y, rFoot.x, rFoot.y);
      if (name === 'ground') setLine(line, -R * 0.56, -R * 0.62, R * 0.56, -R * 0.62);
      updateMat(line, pal.rgb, cfg.intensity / 10, 1.8);
    } else if (tag === 'figureJoint') {
      const joint = child as THREE.Mesh;
      const name = child.userData.name as string;
      const point =
        name === 'chest'
          ? chest
          : name === 'pelvis'
            ? pelvis
            : name === 'leftHand'
              ? lHand
              : name === 'rightHand'
                ? rHand
                : name === 'leftFoot'
                  ? lFoot
                  : rFoot;
      joint.position.set(point.x, point.y, 0);
      joint.scale.setScalar(1 + Math.sin(phase * 2 + point.x * 0.01) * 0.08);
      updateMat(joint, pal.rgb, cfg.intensity / 10, 2.2);
    } else if (tag === 'figureHead') {
      const mesh = child as THREE.Mesh;
      mesh.position.set(head.x, head.y, 0);
      mesh.scale.set(0.92 + Math.sin(phase * 2) * 0.025, 1.06 + Math.cos(phase * 2) * 0.035, 1);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(color);
      mat.opacity = 0.42 + cfg.glow * 0.025;
    } else if (tag === 'figureAura') {
      const aura = child as THREE.Line;
      const pos = aura.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < 180; i++) {
        const q = i / 179;
        const a = q * Math.PI * 2;
        const rr = R * (0.38 + Math.sin(a * 5 + phase) * 0.02 + cfg.complexity * 0.004);
        arr[i * 3] = Math.cos(a) * rr + sway * 0.2;
        arr[i * 3 + 1] = Math.sin(a) * rr - R * 0.04 + bob;
        arr[i * 3 + 2] = 0;
      }
      pos.needsUpdate = true;
      updateMat(aura, pal.rgb, cfg.intensity / 10, 1.4);
    }
  }
}

/* Dot Walker - liquid particle character body for future morphing stories */

const DOT_WALKER_COUNT = 950;

function buildDotWalker(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const pos = new Float32Array(DOT_WALKER_COUNT * 3);
  const seed = new Float32Array(DOT_WALKER_COUNT * 4);

  for (let i = 0; i < DOT_WALKER_COUNT; i++) {
    const q = i / DOT_WALKER_COUNT;
    const zone = q < 0.2 ? 0 : q < 0.44 ? 1 : q < 0.66 ? 2 : q < 0.83 ? 3 : 4;
    const local = (q * DOT_WALKER_COUNT * 1.61803398875) % 1;
    const a = i * 2.399963229728653;
    const spread = Math.sqrt(local);
    seed[i * 4] = zone;
    seed[i * 4 + 1] = Math.cos(a) * spread;
    seed[i * 4 + 2] = Math.sin(a) * spread;
    seed[i * 4 + 3] = Math.random();
    pos[i * 3] = 0;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const dots = new THREE.Points(geo, ptsMat(hdrColor(pal.rgb, cfg.intensity / 10, 2.9), 2.8, 0.82));
  dots.userData.tag = 'dotWalkerDots';
  group.add(dots);

  // Walker trails intentionally omitted — no lines below the figures.

  return group;
}

function walkerLimbPoint(zone: number, sx: number, sy: number, phase: number, R: number) {
  const walk = Math.sin(phase);
  const counter = Math.sin(phase + Math.PI);
  const bob = Math.sin(phase * 2) * R * 0.018;
  if (zone === 0) {
    return {
      x: sx * R * 0.075 + Math.sin(phase * 0.7 + sy) * R * 0.012,
      y: R * 0.42 + sy * R * 0.09 + bob,
      scale: R * 0.085,
    };
  }
  if (zone === 1) {
    return {
      x: sx * R * 0.11 + Math.sin(sy * 3 + phase) * R * 0.018,
      y: R * 0.06 + sy * R * 0.22 + bob,
      scale: R * 0.13,
    };
  }
  if (zone === 2) {
    const side = sx < 0 ? -1 : 1;
    const swing = side < 0 ? walk : counter;
    return {
      x: side * R * (0.22 + Math.abs(sx) * 0.13 + swing * 0.04),
      y: R * (0.03 + sy * 0.11 - swing * 0.12) + bob,
      scale: R * 0.1,
    };
  }
  if (zone === 3) {
    const side = sx < 0 ? -1 : 1;
    const swing = side < 0 ? counter : walk;
    return {
      x: side * R * (0.12 + Math.abs(sx) * 0.11 + swing * 0.12),
      y: -R * (0.34 + Math.abs(sy) * 0.22) + Math.max(0, swing) * R * 0.07,
      scale: R * 0.11,
    };
  }
  return {
    x: sx * R * 0.18 + Math.sin(phase + sy * 2) * R * 0.04,
    y: -R * 0.58 + sy * R * 0.035,
    scale: R * 0.07,
  };
}

function dotWalkerDesignPoint(
  design: number,
  zone: number,
  sx: number,
  sy: number,
  phase: number,
  R: number,
  base: { x: number; y: number; scale: number },
) {
  if (design <= 1) return base;

  const walk = Math.sin(phase);
  const counter = Math.sin(phase + Math.PI);
  const side = sx < 0 ? -1 : 1;

  if (design === 2) {
    // Genie: floating torso with a liquid lower tail and lifted hands.
    if (zone === 0) return { x: sx * R * 0.07, y: R * 0.47 + sy * R * 0.08, scale: R * 0.1 };
    if (zone === 1)
      return {
        x: sx * R * 0.12 + Math.sin(phase + sy * 2) * R * 0.025,
        y: R * 0.13 + sy * R * 0.19,
        scale: R * 0.135,
      };
    if (zone === 2)
      return {
        x: side * R * (0.24 + Math.abs(sx) * 0.16 + Math.sin(phase + side) * 0.04),
        y: R * (0.18 + Math.abs(sy) * 0.18),
        scale: R * 0.105,
      };
    if (zone === 3) {
      const tail = Math.abs(sy);
      return {
        x: Math.sin(tail * 10 + phase * 1.7) * R * (0.06 + tail * 0.12) + sx * R * 0.045,
        y: -R * (0.16 + tail * 0.34),
        scale: R * 0.12,
      };
    }
    return {
      x: Math.sin(phase * 1.8 + sy * 12) * R * (0.03 + Math.abs(sy) * 0.12),
      y: -R * (0.5 + Math.abs(sy) * 0.18),
      scale: R * 0.075,
    };
  }

  if (design === 3) {
    // Dancer: wider lateral sway, lifted knees, and a playful diagonal body.
    const lean = Math.sin(phase * 0.7) * R * 0.08;
    if (zone === 0)
      return { x: sx * R * 0.08 + lean * 0.55, y: R * 0.43 + sy * R * 0.08, scale: R * 0.085 };
    if (zone === 1)
      return {
        x: sx * R * 0.1 + lean + sy * R * 0.04,
        y: R * 0.07 + sy * R * 0.2,
        scale: R * 0.13,
      };
    if (zone === 2) {
      const swing = side < 0 ? walk : counter;
      return {
        x: side * R * (0.28 + Math.abs(sx) * 0.18 + swing * 0.1) + lean,
        y: R * (0.04 + sy * 0.13 + Math.abs(swing) * 0.08),
        scale: R * 0.1,
      };
    }
    if (zone === 3) {
      const swing = side < 0 ? counter : walk;
      return {
        x: side * R * (0.12 + Math.abs(sx) * 0.15 + swing * 0.16) + lean * 0.6,
        y: -R * (0.34 + Math.abs(sy) * 0.2) + Math.max(0, swing) * R * 0.12,
        scale: R * 0.11,
      };
    }
    return { x: sx * R * 0.16 + lean * 0.4, y: -R * 0.58 + sy * R * 0.04, scale: R * 0.07 };
  }

  if (design === 4) {
    // Thinker: compact seated body, one arm near the head, calmer motion.
    if (zone === 0)
      return { x: sx * R * 0.09 - R * 0.03, y: R * 0.36 + sy * R * 0.09, scale: R * 0.1 };
    if (zone === 1)
      return {
        x: sx * R * 0.12 - R * 0.02,
        y: R * 0.02 + sy * R * 0.18,
        scale: R * 0.145,
      };
    if (zone === 2)
      return {
        x: side * R * (0.14 + Math.abs(sx) * 0.1) - (side > 0 ? R * 0.09 : 0),
        y: R * (0.16 + sy * 0.18) + (side > 0 ? R * 0.12 : -R * 0.03),
        scale: R * 0.095,
      };
    if (zone === 3)
      return {
        x: side * R * (0.16 + Math.abs(sx) * 0.16),
        y: -R * (0.24 + Math.abs(sy) * 0.14),
        scale: R * 0.12,
      };
    return { x: sx * R * 0.22, y: -R * 0.4 + sy * R * 0.04, scale: R * 0.08 };
  }

  // Guardian: tall presence with wing-like arms and a slower ceremonial step.
  if (zone === 0) return { x: sx * R * 0.085, y: R * 0.48 + sy * R * 0.08, scale: R * 0.095 };
  if (zone === 1)
    return {
      x: sx * R * 0.1 + Math.sin(sy * 3 + phase) * R * 0.015,
      y: R * 0.1 + sy * R * 0.24,
      scale: R * 0.14,
    };
  if (zone === 2)
    return {
      x: side * R * (0.24 + Math.abs(sx) * 0.24),
      y: R * (0.02 + sy * 0.2 + Math.abs(sx) * 0.28),
      scale: R * 0.11,
    };
  if (zone === 3) {
    const swing = side < 0 ? counter : walk;
    return {
      x: side * R * (0.1 + Math.abs(sx) * 0.1 + swing * 0.06),
      y: -R * (0.36 + Math.abs(sy) * 0.2),
      scale: R * 0.105,
    };
  }
  return { x: sx * R * 0.17, y: -R * 0.62 + sy * R * 0.03, scale: R * 0.07 };
}

function updateDotWalker(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const phase = t * 0.003 * cfg.breathSpeed;
  const design = Math.max(1, Math.min(5, Math.round(cfg.symmetry)));
  const walkerCount = Math.max(1, Math.min(4, Math.round(cfg.stars)));
  const cloneScale = walkerCount > 1 ? 0.82 : 1;
  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'dotWalkerDots') {
      const dots = child as THREE.Points;
      const pos = dots.geometry.getAttribute('position') as THREE.BufferAttribute;
      const seed = dots.geometry.getAttribute('seed') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const sarr = seed.array as Float32Array;
      for (let i = 0; i < DOT_WALKER_COUNT; i++) {
        const zone = sarr[i * 4];
        const sx = sarr[i * 4 + 1];
        const sy = sarr[i * 4 + 2];
        const drift = sarr[i * 4 + 3];
        const base = walkerLimbPoint(zone, sx, sy, phase + drift * 0.6, R);
        const p = dotWalkerDesignPoint(design, zone, sx, sy, phase + drift * 0.6, R, base);
        const liquid =
          Math.sin(phase * 1.8 + sx * 5 + sy * 3 + drift * 6) * R * 0.012 * cfg.complexity;
        const force = fingerForce(p.x, p.y, 0, R);
        const auraWidth = 0.34 + cfg.glow * 0.035;
        let x = p.x + sx * p.scale * auraWidth + Math.cos(sy * 4 + phase) * liquid;
        let y = p.y + sy * p.scale * auraWidth + Math.sin(sx * 4 - phase) * liquid;
        let z = Math.sin(phase + drift * 10) * R * 0.02;

        if (design === 2) {
          const tail = zone >= 3 ? Math.abs(sy) + drift : 0;
          x += Math.sin(tail * 7 + phase * 1.4) * R * 0.11 * (zone >= 3 ? 1 : 0.25);
          y += R * 0.05;
          z += Math.cos(tail * 5 + phase) * R * 0.05;
        } else if (design === 3) {
          const angle = 0.22 + Math.sin(phase * 0.8) * 0.18;
          const nx = x * Math.cos(angle) - y * Math.sin(angle);
          const ny = x * Math.sin(angle) + y * Math.cos(angle);
          x = nx + Math.sin(phase * 1.4 + drift * 4) * R * 0.045;
          y = ny;
        } else if (design === 4) {
          x *= 0.78;
          y = y * 0.72 - R * 0.06;
          if (zone === 2) y += R * 0.1;
          z *= 0.45;
        } else if (design === 5) {
          if (zone === 2) {
            x *= 1.45;
            y += Math.abs(sx) * R * 0.28;
            z += Math.abs(sx) * R * 0.08;
          }
          y += R * 0.04;
        }

        const cloneIndex = i % walkerCount;
        const rowOffset = walkerCount === 4 ? (cloneIndex > 1 ? -R * 0.34 : R * 0.18) : 0;
        const column =
          walkerCount === 1
            ? 0
            : walkerCount === 2
              ? cloneIndex - 0.5
              : walkerCount === 3
                ? cloneIndex - 1
                : (cloneIndex % 2) - 0.5;
        const spacing = R * (walkerCount === 2 ? 0.82 : walkerCount === 3 ? 0.64 : 0.68);
        arr[i * 3] = x * cloneScale + force.x + column * spacing;
        arr[i * 3 + 1] = y * cloneScale + force.y + rowOffset;
        arr[i * 3 + 2] = z * cloneScale + force.z + cloneIndex * R * 0.012;
      }
      pos.needsUpdate = true;
      const mat = dots.material as THREE.PointsMaterial;
      mat.size = (2.35 + cfg.glow * 0.1) * (R / 260) * cloneScale;
      mat.opacity = 0.68 + Math.min(0.22, cfg.glow / 55);
      updateMat(dots, pal.rgb, cfg.intensity / 10, 2.4 + cfg.luminous * 0.24);
    } else if (tag === 'dotWalkerTrail') {
      const trail = child as THREE.Line;
      const trailWalkerIndex = Math.max(0, Math.min(3, Number(trail.userData.walkerIndex ?? 0)));
      trail.visible = trailWalkerIndex < walkerCount;
      const pos = trail.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < 220; i++) {
        const q = i / 219;
        const a = q * Math.PI * 2;
        const rowOffset = walkerCount === 4 ? (trailWalkerIndex > 1 ? -R * 0.34 : R * 0.18) : 0;
        const column =
          walkerCount === 1
            ? 0
            : walkerCount === 2
              ? trailWalkerIndex - 0.5
              : walkerCount === 3
                ? trailWalkerIndex - 1
                : (trailWalkerIndex % 2) - 0.5;
        const spacing = R * (walkerCount === 2 ? 0.82 : walkerCount === 3 ? 0.64 : 0.68);
        if (design === 2) {
          const rr = R * (0.08 + q * 0.28);
          arr[i * 3] = Math.sin(a * 3.8 + phase * 1.6) * rr * cloneScale + column * spacing;
          arr[i * 3 + 1] = -R * (0.62 - q * 0.36) * cloneScale + rowOffset;
          arr[i * 3 + 2] = Math.cos(a * 3.8 + phase) * R * 0.055 * cloneScale;
        } else if (design === 3) {
          arr[i * 3] = (q - 0.5) * R * 1.25 * cloneScale + column * spacing;
          arr[i * 3 + 1] =
            (-R * 0.58 + Math.sin(q * Math.PI * 3 + phase * 1.2) * R * 0.08) * cloneScale +
            rowOffset;
          arr[i * 3 + 2] = Math.cos(q * Math.PI * 4 + phase) * R * 0.03 * cloneScale;
        } else if (design === 4) {
          arr[i * 3] = Math.cos(a) * R * 0.34 * cloneScale + column * spacing;
          arr[i * 3 + 1] = (-R * 0.42 + Math.sin(a) * R * 0.08) * cloneScale + rowOffset;
          arr[i * 3 + 2] = 0;
        } else if (design === 5) {
          arr[i * 3] =
            Math.cos(a) * R * (0.34 + Math.sin(a * 2) * 0.08) * cloneScale + column * spacing;
          arr[i * 3 + 1] = (R * 0.08 + Math.sin(a) * R * 0.42) * cloneScale + rowOffset;
          arr[i * 3 + 2] = Math.sin(a * 2 + phase) * R * 0.05 * cloneScale;
        } else {
          const x = (q - 0.5) * R * 1.16;
          arr[i * 3] = x * cloneScale + column * spacing;
          arr[i * 3 + 1] =
            (-R * 0.66 + Math.sin(q * Math.PI * 4 + phase) * R * 0.018) * cloneScale + rowOffset;
          arr[i * 3 + 2] = 0;
        }
      }
      pos.needsUpdate = true;
      updateMat(trail, pal.rgb, cfg.intensity / 10, 1.5);
    }
  }
}

/* Depth Journey presets - tunnels and roads for future forward-moving programs */

const DEPTH_DOT_COUNT = 2800;
const DEPTH_LINE_RINGS = 34;
const DEPTH_LINE_SEGMENTS = 72;

/* ── Flow Field — continuous-transformation particle system ───── */
const FLOW_FIELD_COUNT = 5200;

// Target formations the flow field morphs between (0 = the dense home disk).
function flowFormation(f: number, i: number, hx: number, hy: number, R: number): [number, number] {
  if (f === 0) return [hx, hy];
  const u = (i + 0.5) / FLOW_FIELD_COUNT;
  const ga = i * 2.399963229728653;
  if (f === 1) {
    // Phyllotaxis sunflower
    const r = Math.sqrt(u) * R * 0.92;
    return [Math.cos(ga) * r, Math.sin(ga) * r];
  }
  if (f === 2) {
    // Concentric rings
    const nR = 7;
    const ring = Math.floor(u * nR);
    const rr = ((ring + 0.6) / nR) * R * 0.92;
    const a = (u * nR - ring) * Math.PI * 2;
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  }
  if (f === 3) {
    // Square lattice
    const cols = Math.round(Math.sqrt(FLOW_FIELD_COUNT));
    const gx = ((i % cols) / (cols - 1) - 0.5) * R * 1.7;
    const gy = (Math.floor(i / cols) / (cols - 1) - 0.5) * R * 1.7;
    return [gx, gy];
  }
  if (f === 4) {
    // Spiral
    const r = u * R * 0.92;
    const a = ga * 0.5 + (r / R) * 7;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  if (f === 5) {
    // Gerono lemniscate — nested figure-8 ribbons (the Magnetic-Sands double loop)
    const ring = 0.4 + 0.6 * ((i * 0.61803398875) % 1);
    const t = u * Math.PI * 2;
    return [Math.cos(t) * R * 0.95 * ring, Math.sin(2 * t) * 0.5 * R * 0.95 * ring];
  }
  // f === 6: double spiral (two counter-rotating arms)
  const arm = i % 2 === 0 ? 1 : -1;
  const r6 = u * R * 0.92;
  const a6 = arm * (ga * 0.5 + (r6 / R) * 7);
  return [Math.cos(a6) * r6, Math.sin(a6) * r6];
}

// Movements: each owns a target formation + force mix; the field crossfades
// between them continuously (~75s each) so it is always transforming. A long
// 10-act cycle (~12.5 min) that now folds in two figure-8 "double loop" acts.
const FLOW_MOVEMENTS = [
  { form: 0, spring: 0.08, swirl: 0.3, flow: 0.5, breath: 0.2, wob: 0.1 },
  { form: 1, spring: 0.07, swirl: 0.45, flow: 0.6, breath: 0.35, wob: 0.25 },
  { form: 5, spring: 0.06, swirl: 0.7, flow: 0.7, breath: 0.3, wob: 0.2 }, // figure-8 double loop
  { form: 0, spring: 0.05, swirl: 1.0, flow: 0.7, breath: 0.3, wob: 0.15 },
  { form: 2, spring: 0.09, swirl: 0.3, flow: 0.4, breath: 0.2, wob: 0.9 },
  { form: 6, spring: 0.07, swirl: 0.55, flow: 0.65, breath: 0.4, wob: 0.2 }, // double spiral
  { form: 3, spring: 0.11, swirl: 0.2, flow: 0.3, breath: 0.15, wob: 0.1 },
  { form: 5, spring: 0.06, swirl: 0.8, flow: 0.75, breath: 0.35, wob: 0.2 }, // figure-8 again, faster
  { form: 4, spring: 0.06, swirl: 0.6, flow: 0.7, breath: 0.5, wob: 0.2 },
  { form: 1, spring: 0.07, swirl: 0.4, flow: 0.55, breath: 0.3, wob: 0.2 },
];

// Flow Walkers — formations are walker silhouettes (designs 1–5); the field
// morphs from one walking figure into the next through the flow.
function flowWalkerFormation(design: number, i: number, R: number, ph: number): [number, number] {
  // ~1 in 5 particles ring the figure with a slow 6-fold sacred halo, so the
  // walker reads against a circle of context (like the dot-walker mode).
  if (i % 5 === 0) {
    const cu = (i * 0.61803398875) % 1;
    const ca = cu * Math.PI * 2 + ph * 0.15;
    const petal = 0.92 + 0.1 * Math.cos(ca * 6);
    const rr = R * (1.2 + 0.25 * cu) * petal;
    return [Math.cos(ca) * rr, Math.sin(ca) * rr];
  }
  const q = (i + 0.5) / FLOW_FIELD_COUNT;
  const zone = q < 0.2 ? 0 : q < 0.44 ? 1 : q < 0.66 ? 2 : q < 0.83 ? 3 : 4;
  const local = (q * FLOW_FIELD_COUNT * 1.61803398875) % 1;
  const a = i * 2.399963229728653;
  const spread = Math.sqrt(local);
  const sx = Math.cos(a) * spread;
  const sy = Math.sin(a) * spread;
  const FR = R * 1.5;
  const walkPh = ph * 22; // animate the limbs — the figure walks
  const base = walkerLimbPoint(zone, sx, sy, walkPh, FR);
  const p = dotWalkerDesignPoint(Math.max(1, Math.min(5, design)), zone, sx, sy, walkPh, FR, base);
  return [p.x + sx * p.scale * 0.4, p.y + sy * p.scale * 0.4];
}

// Higher spring + lower flow/swirl so the walker silhouette holds crisp (reads
// as a figure, closer to the classic Dot Walker) instead of being blurred away.
const FLOW_MOVEMENTS_WALK = [
  { form: 1, spring: 0.2, swirl: 0.1, flow: 0.18, breath: 0.12, wob: 0.06 },
  { form: 2, spring: 0.2, swirl: 0.12, flow: 0.2, breath: 0.14, wob: 0.06 },
  { form: 3, spring: 0.19, swirl: 0.14, flow: 0.22, breath: 0.14, wob: 0.06 },
  { form: 4, spring: 0.2, swirl: 0.12, flow: 0.2, breath: 0.14, wob: 0.06 },
  { form: 5, spring: 0.2, swirl: 0.1, flow: 0.18, breath: 0.12, wob: 0.06 },
];

// Flow Sacred — sacred-geometry formations (rose, star, flower-of-life,
// lissajous) morphing through one colourful psychedelic field.
function flowSacredFormation(
  f: number,
  i: number,
  hx: number,
  hy: number,
  R: number,
): [number, number] {
  if (f === 0) return [hx, hy];
  const u = (i + 0.5) / FLOW_FIELD_COUNT;
  if (f === 1) {
    // Rose curve (rhodonea)
    const k = 5;
    const a = u * Math.PI * 2;
    const r = Math.cos(k * a) * R * 0.9;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  if (f === 2) {
    // Star polygon ring
    const points = 6;
    const a = u * Math.PI * 2;
    const star = 0.7 + 0.3 * Math.cos(a * points);
    return [Math.cos(a) * R * 0.9 * star, Math.sin(a) * R * 0.9 * star];
  }
  if (f === 3) {
    // Flower-of-life: seven sub-circles
    const centers = [
      [0, 0],
      [1, 0],
      [0.5, 0.866],
      [-0.5, 0.866],
      [-1, 0],
      [-0.5, -0.866],
      [0.5, -0.866],
    ];
    const cell = Math.floor(u * 7) % 7;
    const ca = (u * 7 - Math.floor(u * 7)) * Math.PI * 2;
    const c = centers[cell];
    const sub = R * 0.3;
    return [c[0] * sub * 1.6 + Math.cos(ca) * sub, c[1] * sub * 1.6 + Math.sin(ca) * sub];
  }
  if (f === 4) {
    // Lissajous
    const a = u * Math.PI * 2;
    return [Math.sin(a * 3) * R * 0.85, Math.sin(a * 2) * R * 0.85];
  }
  if (f === 5) {
    // Hexagram — two interlocking triangles
    const a = u * Math.PI * 2 + (i % 2 ? Math.PI : 0);
    const r = (0.55 + 0.45 * Math.abs(Math.cos(1.5 * a))) * R * 0.85;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  if (f === 6) {
    // Spiral galaxy
    const arms = 3;
    const r = u * R * 0.92;
    const ga = (i % arms) * ((Math.PI * 2) / arms) + (r / R) * 6;
    return [Math.cos(ga) * r, Math.sin(ga) * r];
  }
  if (f === 7) {
    // Yantra — nested up/down triangles inside a bindu
    const tier = Math.floor(u * 4); // 0..3 concentric triangles
    const up = tier % 2 === 0 ? 1 : -1;
    const scale = (1 - tier * 0.22) * R * 0.92;
    const edge = (u * 4 - tier) * 3; // 0..3 around the triangle perimeter
    const corner = Math.floor(edge);
    const tt = edge - corner;
    const ang = (k: number) => (k / 3) * Math.PI * 2 + Math.PI / 2;
    const a0 = ang(corner);
    const a1 = ang(corner + 1);
    const x = lerp(Math.cos(a0), Math.cos(a1), tt) * scale;
    const y = up * lerp(Math.sin(a0), Math.sin(a1), tt) * scale;
    return [x, y];
  }
  // f === 8: focus arc — a single sweeping mono arc (calm point of focus)
  const span = Math.PI * 1.25;
  const a8 = -span / 2 + u * span;
  const r8 = R * (0.55 + 0.4 * (1 - Math.abs(u - 0.5) * 2));
  return [Math.cos(a8) * r8, Math.sin(a8) * r8];
}

const FLOW_MOVEMENTS_SACRED = [
  { form: 8, spring: 0.09, swirl: 0.2, flow: 0.4, breath: 0.3, wob: 0.15 }, // focus arc
  { form: 1, spring: 0.08, swirl: 0.3, flow: 0.5, breath: 0.3, wob: 0.2 },
  { form: 7, spring: 0.1, swirl: 0.25, flow: 0.4, breath: 0.2, wob: 0.2 }, // yantra
  { form: 2, spring: 0.09, swirl: 0.3, flow: 0.5, breath: 0.25, wob: 0.3 },
  { form: 5, spring: 0.09, swirl: 0.3, flow: 0.45, breath: 0.25, wob: 0.25 },
  { form: 3, spring: 0.09, swirl: 0.25, flow: 0.4, breath: 0.2, wob: 0.4 },
  { form: 6, spring: 0.08, swirl: 0.45, flow: 0.6, breath: 0.3, wob: 0.2 },
  { form: 4, spring: 0.08, swirl: 0.4, flow: 0.6, breath: 0.3, wob: 0.2 }, // lissajous
  { form: 0, spring: 0.07, swirl: 0.5, flow: 0.6, breath: 0.4, wob: 0.2 },
];

// Dance Walkers — two walker figures that drift together, merge, bloom, dance,
// divide and resolve into a heart, in one continuous evolution.
function flowDanceFormation(f: number, i: number, R: number, ph: number): [number, number] {
  const N = FLOW_FIELD_COUNT;
  // ~1 in 6 particles ring the pair with a slow sacred halo of context.
  if (i % 6 === 0) {
    const cu = (i * 0.61803398875) % 1;
    const ca = cu * Math.PI * 2 + ph * 0.12;
    const petal = 0.92 + 0.1 * Math.cos(ca * 6);
    const rr = R * (1.25 + 0.22 * cu) * petal;
    return [Math.cos(ca) * rr, Math.sin(ca) * rr];
  }
  if (f === 4) {
    // Heart — particles fill a heart curve.
    const u = (i + 0.5) / N;
    const th = u * Math.PI * 2;
    const hx = 16 * Math.sin(th) ** 3;
    const hy = 13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th);
    const s = R * 0.05;
    const fill = ((i * 0.61803398875) % 1) ** 0.5;
    return [lerp(0, hx * s, fill), lerp(-2 * s, hy * s, fill)];
  }
  // Two walker silhouettes (left/right halves of the particles).
  const half = N >> 1;
  const isLeft = i < half;
  const j = isLeft ? i : i - half;
  const side = isLeft ? -1 : 1;
  const wq = (j + 0.5) / half;
  const zone = wq < 0.2 ? 0 : wq < 0.44 ? 1 : wq < 0.66 ? 2 : wq < 0.83 ? 3 : 4;
  const local = (wq * half * 1.61803398875) % 1;
  const a = j * 2.399963229728653;
  const spread = Math.sqrt(local);
  const sx = Math.cos(a) * spread;
  const sy = Math.sin(a) * spread;
  const FR = R * 0.95;
  const design = f === 3 ? 5 : 1; // posed "dance" design vs upright
  const walkPh = ph * 20; // animate the limbs — the figures step and sway
  const base = walkerLimbPoint(zone, sx, sy, walkPh, FR);
  const p = dotWalkerDesignPoint(design, zone, sx, sy, walkPh, FR, base);
  const wx = p.x + sx * p.scale * 0.4;
  const wy = p.y + sy * p.scale * 0.4;
  const sep = f === 0 ? R * 0.62 : f === 1 ? R * 0.34 : f === 2 ? 0 : R * 0.42;
  return [wx + side * sep, wy];
}

const FLOW_MOVEMENTS_DANCE = [
  { form: 0, spring: 0.1, swirl: 0.2, flow: 0.4, breath: 0.15, wob: 0.1 }, // apart
  { form: 1, spring: 0.1, swirl: 0.3, flow: 0.5, breath: 0.2, wob: 0.1 }, // converge
  { form: 2, spring: 0.09, swirl: 0.5, flow: 0.5, breath: 0.3, wob: 0.1 }, // merge
  { form: 3, spring: 0.08, swirl: 0.7, flow: 0.6, breath: 0.4, wob: 0.15 }, // dance / bloom
  { form: 1, spring: 0.1, swirl: 0.3, flow: 0.5, breath: 0.2, wob: 0.1 }, // divide
  { form: 0, spring: 0.1, swirl: 0.2, flow: 0.4, breath: 0.15, wob: 0.1 }, // apart
  { form: 4, spring: 0.11, swirl: 0.2, flow: 0.3, breath: 0.2, wob: 0.1 }, // heart
];

// Magnetic Sands 2 — a long, sandy game of chaos and order: dense dots melt
// from waves to ripples to a vortex, fold through figure-8 dunes, and re-form.
// High wob gives the grainy banding; two lemniscate acts give the double loop.
function flowSandsFormation(
  f: number,
  i: number,
  hx: number,
  hy: number,
  R: number,
): [number, number] {
  if (f === 0) return [hx, hy];
  const u = (i + 0.5) / FLOW_FIELD_COUNT;
  const ga = i * 2.399963229728653;
  // ~1 in 4 particles hold a persistent concentric-ring order, so circle
  // patterns keep emerging inside the chaos whichever sand act is playing.
  if (i % 4 === 0) {
    const nR = 7;
    const u2 = (i * 0.7548776662) % 1;
    const ring = Math.floor(u2 * nR);
    const rr = ((ring + 0.55) / nR) * R * 0.82;
    const a = (u2 * nR - ring) * Math.PI * 2 + ga * 0.15;
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  }
  if (f === 1) {
    // Sand waves — horizontal flowing bands
    const rows = 9;
    const row = Math.floor(u * rows);
    const fx = (((i * 0.61803398875) % 1) - 0.5) * R * 1.9;
    const fy = ((row + 0.5) / rows - 0.5) * R * 1.7 + Math.sin((fx / R) * 3) * R * 0.12;
    return [fx, fy];
  }
  if (f === 2) {
    // Ripple rings — dense concentric bands
    const nR = 11;
    const ring = Math.floor(u * nR);
    const rr = ((ring + 0.5) / nR) * R * 0.95;
    const a = (u * nR - ring) * Math.PI * 2;
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  }
  if (f === 3) {
    // Vortex — tight log spiral
    const r = Math.sqrt(u) * R * 0.95;
    const a = ga * 0.5 + (r / R) * 10;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  if (f === 4) {
    // Dune lemniscate — figure-8 (the double loop)
    const ring = 0.35 + 0.65 * ((i * 0.61803398875) % 1);
    const t = u * Math.PI * 2;
    return [Math.cos(t) * R * 0.98 * ring, Math.sin(2 * t) * 0.55 * R * 0.98 * ring];
  }
  // f === 5: dust disk
  const r = Math.sqrt(u) * R * 0.92;
  return [Math.cos(ga) * r, Math.sin(ga) * r];
}

// 12 acts (~15 min) — long enough to keep surprising guests.
const FLOW_MOVEMENTS_SANDS = [
  { form: 5, spring: 0.05, swirl: 0.4, flow: 0.6, breath: 0.3, wob: 0.5 },
  { form: 1, spring: 0.06, swirl: 0.25, flow: 0.5, breath: 0.25, wob: 0.7 },
  { form: 2, spring: 0.07, swirl: 0.3, flow: 0.45, breath: 0.2, wob: 0.9 },
  { form: 4, spring: 0.05, swirl: 0.7, flow: 0.7, breath: 0.35, wob: 0.4 }, // double loop
  { form: 3, spring: 0.05, swirl: 0.9, flow: 0.75, breath: 0.3, wob: 0.3 },
  { form: 1, spring: 0.06, swirl: 0.3, flow: 0.55, breath: 0.3, wob: 0.8 },
  { form: 5, spring: 0.05, swirl: 0.5, flow: 0.6, breath: 0.4, wob: 0.5 },
  { form: 4, spring: 0.05, swirl: 0.8, flow: 0.72, breath: 0.35, wob: 0.4 }, // double loop
  { form: 2, spring: 0.07, swirl: 0.35, flow: 0.5, breath: 0.25, wob: 0.95 },
  { form: 3, spring: 0.05, swirl: 1.0, flow: 0.8, breath: 0.3, wob: 0.3 },
  { form: 1, spring: 0.06, swirl: 0.28, flow: 0.5, breath: 0.25, wob: 0.7 },
  { form: 5, spring: 0.05, swirl: 0.45, flow: 0.6, breath: 0.35, wob: 0.5 },
];

// Butterfly — the Brain-Loop two-figures idea grown into a butterfly: dots fill
// Fay's butterfly curve, the wings flap (time phase), open wide, spin/dance,
// split into two wings that orbit apart, then reunite. Continuous evolution.
function flowButterflyFormation(f: number, i: number, R: number, ph: number): [number, number] {
  const N = FLOW_FIELD_COUNT;
  // ~1 in 7 particles ring the butterfly with a slow sacred halo of context.
  if (i % 7 === 0) {
    const cu = (i * 0.61803398875) % 1;
    const ca = cu * Math.PI * 2 + ph * 0.12;
    const petal = 0.92 + 0.1 * Math.cos(ca * 6);
    const rr = R * (1.25 + 0.2 * cu) * petal;
    return [Math.cos(ca) * rr, Math.sin(ca) * rr];
  }
  if (f === 0) {
    // Rest — a soft disk
    const r0 = Math.sqrt((i + 0.5) / N) * R * 0.6;
    const a0 = i * 2.399963229728653;
    return [Math.cos(a0) * r0, Math.sin(a0) * r0];
  }
  const u = (i + 0.5) / N;
  const t = u * 24 * Math.PI; // sweep the whole butterfly curve
  const r = Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.sin((2 * t - Math.PI) / 24) ** 5;
  const s = R * 0.16;
  let bx = Math.sin(t) * r * s;
  let by = Math.cos(t) * r * s;
  const flap = 0.45 + 0.55 * Math.abs(Math.cos(ph * 1.6)); // wings beat
  if (f === 1) bx *= flap; // flapping butterfly
  if (f === 2) {
    bx *= 1.18; // wings wide open
    by *= 1.06;
  }
  if (f === 3) {
    const side = bx < 0 ? -1 : 1; // split the two wings apart
    bx = bx * flap + side * R * 0.55;
  }
  return [bx, by];
}

const FLOW_MOVEMENTS_BUTTERFLY = [
  { form: 0, spring: 0.09, swirl: 0.2, flow: 0.4, breath: 0.2, wob: 0.1 }, // gather
  { form: 1, spring: 0.09, swirl: 0.25, flow: 0.45, breath: 0.3, wob: 0.12 }, // flap
  { form: 2, spring: 0.08, swirl: 0.35, flow: 0.5, breath: 0.4, wob: 0.15 }, // open wide
  { form: 1, spring: 0.07, swirl: 0.9, flow: 0.65, breath: 0.4, wob: 0.15 }, // spin / dance
  { form: 3, spring: 0.08, swirl: 0.45, flow: 0.55, breath: 0.3, wob: 0.12 }, // wings divide
  { form: 1, spring: 0.09, swirl: 0.25, flow: 0.45, breath: 0.3, wob: 0.12 }, // reunite & flap
];

// Star-Sand Lines — shifting star-sand that DRAWS the great line-works
// (torus knot, rose, helix, orbital rings) out of dots. High spring holds the
// curves crisp; multiple parallel strands give the lines body, like sand poured
// along a path. Morphs continuously from one line-form to the next.
function flowLinesFormation(f: number, i: number, R: number, ph: number): [number, number] {
  const N = FLOW_FIELD_COUNT;
  if (f === 0) {
    const r0 = Math.sqrt((i + 0.5) / N) * R * 0.7;
    const a0 = i * 2.399963229728653;
    return [Math.cos(a0) * r0, Math.sin(a0) * r0];
  }
  // Each particle sits on one of several parallel strands so the "line" reads
  // thick; the strand offset is a tiny perpendicular nudge.
  const strands = 5;
  const strand = i % strands;
  const off = (strand / (strands - 1) - 0.5) * R * 0.06;
  const u = (Math.floor(i / strands) + 0.5) / (N / strands);
  if (f === 1) {
    // Torus knot (p=2, q=3) — top-down projection
    const th = u * Math.PI * 2;
    const rr = 2 + Math.cos(3 * th);
    const s = (R * 0.92) / 3;
    return [Math.cos(2 * th) * rr * s + off, Math.sin(2 * th) * rr * s + off];
  }
  if (f === 2) {
    // Rose / rhodonea (k=4)
    const th = u * Math.PI * 2;
    const rr = Math.cos(4 * th) * R * 0.92;
    return [Math.cos(th) * rr + off, Math.sin(th) * rr + off];
  }
  if (f === 3) {
    // Helix — an elliptical spiral seen at a tilt
    const a = u * Math.PI * 2 * 5;
    const rr = (0.2 + 0.78 * u) * R * 0.92;
    return [Math.cos(a) * rr + off, Math.sin(a) * rr * 0.42 + (u - 0.5) * R * 0.9 + off];
  }
  // f === 4: orbital — nested tilted rings
  const rings = 5;
  const ring = Math.floor(u * rings);
  const rr = ((ring + 1) / rings) * R * 0.9;
  const tilt = 0.25 + ring * 0.32;
  const a = (u * rings - ring) * Math.PI * 2 + ring * 0.7;
  return [Math.cos(a) * rr + off, Math.sin(a) * rr * Math.cos(tilt) + off];
}

const FLOW_MOVEMENTS_LINES = [
  { form: 1, spring: 0.14, swirl: 0.15, flow: 0.3, breath: 0.25, wob: 0.08 }, // torus knot
  { form: 2, spring: 0.14, swirl: 0.18, flow: 0.32, breath: 0.3, wob: 0.08 }, // rose
  { form: 4, spring: 0.13, swirl: 0.2, flow: 0.34, breath: 0.25, wob: 0.08 }, // orbital
  { form: 3, spring: 0.13, swirl: 0.16, flow: 0.32, breath: 0.3, wob: 0.08 }, // helix
  { form: 2, spring: 0.14, swirl: 0.4, flow: 0.45, breath: 0.35, wob: 0.1 }, // rose, swirling
  { form: 1, spring: 0.14, swirl: 0.15, flow: 0.3, breath: 0.25, wob: 0.08 }, // knot
];

function flowFormationFor(
  mode: Mode,
  f: number,
  i: number,
  hx: number,
  hy: number,
  R: number,
  ph: number,
): [number, number] {
  if (mode === 'flowwalkers') return flowWalkerFormation(f, i, R, ph);
  if (mode === 'flowsacred') return flowSacredFormation(f, i, hx, hy, R);
  if (mode === 'flowdance') return flowDanceFormation(f, i, R, ph);
  if (mode === 'flowsands') return flowSandsFormation(f, i, hx, hy, R);
  if (mode === 'flowbutterfly') return flowButterflyFormation(f, i, R, ph);
  if (mode === 'flowlines') return flowLinesFormation(f, i, R, ph);
  return flowFormation(f, i, hx, hy, R);
}

function flowMovementsFor(mode: Mode) {
  if (mode === 'flowwalkers') return FLOW_MOVEMENTS_WALK;
  if (mode === 'flowsacred') return FLOW_MOVEMENTS_SACRED;
  if (mode === 'flowdance') return FLOW_MOVEMENTS_DANCE;
  if (mode === 'flowsands') return FLOW_MOVEMENTS_SANDS;
  if (mode === 'flowbutterfly') return FLOW_MOVEMENTS_BUTTERFLY;
  if (mode === 'flowlines') return FLOW_MOVEMENTS_LINES;
  return FLOW_MOVEMENTS;
}

function buildFlowField(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pos = new Float32Array(FLOW_FIELD_COUNT * 3);
  const vel = new Float32Array(FLOW_FIELD_COUNT * 3);
  const seed = new Float32Array(FLOW_FIELD_COUNT * 3);
  const col = new Float32Array(FLOW_FIELD_COUNT * 3).fill(1);
  const home = new Float32Array(FLOW_FIELD_COUNT * 2);
  for (let i = 0; i < FLOW_FIELD_COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * R * 0.9;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r;
    pos[i * 3 + 2] = (Math.random() - 0.5) * R * 0.12;
    home[i * 2] = pos[i * 3];
    home[i * 2 + 1] = pos[i * 3 + 1];
    seed[i * 3] = Math.random();
    seed[i * 3 + 1] = Math.random();
    seed[i * 3 + 2] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 2.6 + cfg.luminous * 0.6,
      map: getCircleTex(),
      vertexColors: true,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
      alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  pts.userData.tag = 'flowField';
  pts.userData.vel = vel;
  pts.userData.seed = seed;
  pts.userData.home = home;
  pts.userData.lastT = -1;
  pts.userData.flowPh = 0;
  pts.userData.flowMClock = 0;
  group.add(pts);
  return group;
}

function updateFlowField(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Cosmic Indigo'];
  const iF = cfg.intensity / 10;
  const speed = Math.max(0.05, cfg.breathSpeed);
  // Movement state machine + phase clock are accumulated per-frame inside the
  // particle group (below) so changing Flow Speed never restarts the program.
  const MOVES = flowMovementsFor(cfg.mode);
  const revRate =
    cfg.mode === 'flowwalkers' ||
    cfg.mode === 'flowdance' ||
    cfg.mode === 'flowbutterfly' ||
    cfg.mode === 'flowlines'
      ? 0.06
      : 0.4;
  const sound = Math.min(1, _voiceEnergy * 1.4 + _musicPulse * 0.5);
  const wells = Math.max(2, Math.min(4, Math.round(cfg.symmetry / 4) + 1));
  const turb = 0.4 + cfg.complexity / 10;
  const scaleBands = 4 + Math.round(cfg.complexity);
  // "Liquid" — higher complexity keeps more momentum so particles trail and
  // stream like liquid (reads well from ~4 up). 0.82 (crisp) → 0.93 (liquid).
  const liquidAmt = Math.min(1, Math.max(0, (cfg.complexity - 1) / 9));
  const liquidDamp = 0.82 + liquidAmt * 0.11;
  // Liquid also loosens the spring so the figure lags and smears (visible even
  // on the crisp high-spring walker modes): full spring at 1, ~35% at 10.
  const liquidSpring = 1 - liquidAmt * 0.65;
  const baseCol = new THREE.Color(pal.rgb[0] / 255, pal.rgb[1] / 255, pal.rgb[2] / 255);
  const baseHsl = { h: 0, s: 0, l: 0 };
  baseCol.getHSL(baseHsl);
  const hueSpread = 0.04 + cfg.glow * 0.03;
  const bright = iF * (1.5 + cfg.luminous * 0.15);
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    if (child.userData.tag !== 'flowField') continue;
    const pts = child as THREE.Points;
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = pts.geometry.getAttribute('color') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const cArr = colAttr.array as Float32Array;
    const vel = pts.userData.vel as Float32Array;
    const seed = pts.userData.seed as Float32Array;
    const home = pts.userData.home as Float32Array;
    const drawCount = Math.round(lerp(2200, FLOW_FIELD_COUNT, cfg.particles / 10));

    // Accumulate the phase + movement clock per-frame (dt × speed) so changing
    // Flow Speed only changes the rate going forward — the continuum is kept.
    const last = pts.userData.lastT as number;
    const dt = last < 0 ? 16 : Math.max(0, Math.min(100, t - last));
    pts.userData.lastT = t;
    const ph = (pts.userData.flowPh as number) + dt * 0.00018 * speed;
    pts.userData.flowPh = ph;
    const mClock = (pts.userData.flowMClock as number) + ((dt / 1000) * speed) / 75;
    pts.userData.flowMClock = mClock;
    const mLen = MOVES.length;
    const mi = ((Math.floor(mClock) % mLen) + mLen) % mLen;
    const mn = (mi + 1) % mLen;
    let mf = mClock - Math.floor(mClock);
    mf = mf * mf * (3 - 2 * mf);
    const MA = MOVES[mi];
    const MB = MOVES[mn];
    const springK = lerp(MA.spring, MB.spring, mf);
    const swirlW = lerp(MA.swirl, MB.swirl, mf);
    const flowW = lerp(MA.flow, MB.flow, mf);
    const breathW = lerp(MA.breath, MB.breath, mf);
    const wobW = lerp(MA.wob, MB.wob, mf);
    const formA = MA.form;
    const formB = MB.form;
    const hueCycle = (mClock * 0.1) % 1;

    for (let i = 0; i < FLOW_FIELD_COUNT; i++) {
      let px = arr[i * 3];
      let py = arr[i * 3 + 1];
      const s0 = seed[i * 3];
      const hx = home[i * 2];
      const hy = home[i * 2 + 1];

      // Formation morph: crossfade this particle between the two movements'
      // target formations, then revolve the whole field slowly.
      const fa = flowFormationFor(cfg.mode, formA, i, hx, hy, R, ph);
      const fb = flowFormationFor(cfg.mode, formB, i, hx, hy, R, ph);
      const bx = lerp(fa[0], fb[0], mf);
      const by = lerp(fa[1], fb[1], mf);
      const ang = ph * revRate;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      let tx = bx * ca - by * sa;
      let ty = bx * sa + by * ca;

      // Organic flow drift of the target, weighted by the movement.
      tx += Math.sin(ty * 0.011 + ph * 2 + s0 * 6) * R * 0.07 * turb * flowW;
      ty += Math.cos(tx * 0.011 - ph * 2 + s0 * 6) * R * 0.07 * turb * flowW;

      // Gravity wells orbiting on ellipses — swirl the target locally (eddies).
      for (let k = 0; k < wells; k++) {
        const kp = ph * (0.6 + k * 0.27) + (k / wells) * Math.PI * 2;
        const gx = Math.cos(kp) * R * (0.34 + 0.1 * k);
        const gy = Math.sin(kp * 1.3) * R * (0.2 + 0.06 * k);
        const dx = tx - gx;
        const dy = ty - gy;
        const d2 = dx * dx + dy * dy + R * R * 0.02;
        const sw = ((R * R * 0.05) / d2) * swirlW * 0.02;
        tx += -dy * sw;
        ty += dx * sw;
      }

      // Magnetic-sand scale wobble on the target radius — a pattern, not a pull.
      const trad = Math.hypot(tx, ty) + 0.0001;
      const wob = Math.sin((trad / R) * scaleBands * Math.PI + ph * 2.5) * R * 0.03 * wobW;
      tx += (tx / trad) * wob;
      ty += (ty / trad) * wob;

      // Gentle whole-field breathing (keeps the centre populated).
      const breath = 1 + breathW * 0.08 * (0.5 + sound);
      tx *= breath;
      ty *= breath;

      // Spring toward the revolving, perturbed target → preserves dense formations.
      let vx = (vel[i * 3] + (tx - px) * springK * liquidSpring) * liquidDamp;
      let vy = (vel[i * 3 + 1] + (ty - py) * springK * liquidSpring) * liquidDamp;
      const vmax = R * 0.05;
      const vmag = Math.hypot(vx, vy);
      if (vmag > vmax) {
        vx = (vx / vmag) * vmax;
        vy = (vy / vmag) * vmax;
      }
      vel[i * 3] = vx;
      vel[i * 3 + 1] = vy;
      px += vx;
      py += vy;

      const rad = Math.hypot(px, py) + 0.0001;
      const force = fingerForce(px, py, 0, R);
      arr[i * 3] = px + force.x;
      arr[i * 3 + 1] = py + force.y;
      arr[i * 3 + 2] = Math.sin(rad * 0.01 + ph * 3 + s0 * 6) * R * 0.05 + force.z;

      // Per-particle hue drifts outward across the radius and over the cycle.
      let hue = (baseHsl.h + (rad / R) * hueSpread + hueCycle + s0 * 0.05) % 1;
      if (hue < 0) hue += 1;
      tmpCol.setHSL(hue, Math.min(1, baseHsl.s + 0.18), Math.min(0.72, baseHsl.l + 0.12));
      cArr[i * 3] = tmpCol.r * bright;
      cArr[i * 3 + 1] = tmpCol.g * bright;
      cArr[i * 3 + 2] = tmpCol.b * bright;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    pts.geometry.setDrawRange(0, drawCount);
    const mat = pts.material as THREE.PointsMaterial;
    mat.size = (2.0 + cfg.luminous * 0.7 + sound * 1.5) * (R / 260);
    mat.opacity = Math.min(0.95, 0.55 + iF * 0.3 + sound * 0.15);
  }
}

function buildDepthJourney(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const iF = cfg.intensity / 10;

  if (cfg.mode === 'linetunnel3d') {
    for (let ring = 0; ring < DEPTH_LINE_RINGS; ring++) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(DEPTH_LINE_SEGMENTS * 2 * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const ribs = new THREE.LineSegments(geo, lineMat(hdrColor(pal.rgb, iF * 0.55, 2.1), 1.0));
      ribs.userData.tag = 'depthLineRing';
      ribs.userData.ring = ring;
      group.add(ribs);
    }

    const spokeGeo = new THREE.BufferGeometry();
    const spokeCount = Math.max(5, Math.round(cfg.symmetry));
    spokeGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(spokeCount * 2 * 3), 3),
    );
    const spokes = new THREE.LineSegments(
      spokeGeo,
      lineMat(hdrColor(pal.rgb, iF * 0.35, 1.8), 0.8),
    );
    spokes.userData.tag = 'depthLineSpokes';
    group.add(spokes);
    return group;
  }

  const positions = new Float32Array(DEPTH_DOT_COUNT * 3);
  const seed = new Float32Array(DEPTH_DOT_COUNT * 4);
  for (let i = 0; i < DEPTH_DOT_COUNT; i++) {
    seed[i * 4] = Math.random();
    seed[i * 4 + 1] = Math.random();
    seed[i * 4 + 2] = Math.random();
    seed[i * 4 + 3] = i / DEPTH_DOT_COUNT;
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const dots = new THREE.Points(geo, circlePtsMat(hdrColor(pal.rgb, iF, 2.5), 2.1, 0.58));
  dots.userData.tag = 'depthDots';
  group.add(dots);
  return group;
}

function updateDepthJourney(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const iF = cfg.intensity / 10;
  const phase = t * 0.0001 * cfg.breathSpeed;
  const TAU = Math.PI * 2;
  const depthPower = lerp(1.15, 1.85, cfg.complexity / 10);
  const vanishing = R * lerp(0.018, 0.09, cfg.glow / 10);

  for (const child of group.children) {
    const tag = child.userData.tag as string;

    if (tag === 'depthDots') {
      const pts = child as THREE.Points;
      const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const seed = pts.geometry.getAttribute('seed') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const sarr = seed.array as Float32Array;
      const dotLimit = Math.round(lerp(900, DEPTH_DOT_COUNT, cfg.particles / 10));

      for (let i = 0; i < DEPTH_DOT_COUNT; i++) {
        const u = sarr[i * 4];
        const v = sarr[i * 4 + 1];
        const w = sarr[i * 4 + 2];
        const q = sarr[i * 4 + 3];
        let x = 99999;
        let y = 99999;
        let z = 0;

        if (i < dotLimit && (cfg.mode === 'dottunnel' || cfg.mode === 'swirldottunnel')) {
          const travel = (q + phase * 0.95) % 1;
          const near = travel ** depthPower;
          const ring = Math.floor(u * Math.max(6, Math.round(cfg.symmetry)));
          const ringFrac = (u * Math.max(6, Math.round(cfg.symmetry))) % 1;
          const swirl =
            cfg.mode === 'swirldottunnel'
              ? phase * lerp(1.2, 4.2, cfg.complexity / 10) + travel * TAU * 1.4
              : Math.sin(phase + travel * TAU) * 0.08;
          const a =
            v * TAU +
            (ring / Math.max(6, Math.round(cfg.symmetry))) * 0.14 +
            swirl +
            Math.sin(w * TAU + phase * 2) * 0.025;
          const tubeNoise = 0.84 + ringFrac * 0.18 + Math.sin(v * TAU * 5 + phase + w * 4) * 0.035;
          const radius = vanishing + R * 1.14 * near * tubeNoise;
          if (cfg.mode === 'swirldottunnel') {
            // Magnetic-sand scale banding — a radial pattern that drifts and evolves.
            const evo = phase * 0.5;
            const sand =
              1 + Math.sin(a * Math.max(3, cfg.symmetry * 0.5) + evo * 3 + travel * 6) * 0.12;
            const r2 = radius * sand;
            x = Math.cos(a) * r2;
            y = Math.sin(a) * r2 * 0.72;
            // A gravity element orbiting on an ellipse; nearby dots swirl around it.
            const gx = Math.cos(evo) * R * 0.24;
            const gy = Math.sin(evo * 1.3) * R * 0.14;
            const ddx = x - gx;
            const ddy = y - gy;
            const gd = Math.hypot(ddx, ddy) + R * 0.05;
            const swirlAmt = (R * R * 0.012 * near) / (gd * gd);
            x += (-ddy / gd) * swirlAmt;
            y += (ddx / gd) * swirlAmt;
          } else {
            x = Math.cos(a) * radius;
            y = Math.sin(a) * radius * 0.72;
          }
          z = (0.5 - travel) * R * 0.72;
        } else if (i < dotLimit && cfg.mode === 'dotroad') {
          const travel = (q + phase * 0.82) % 1;
          const near = travel ** lerp(1.3, 2.15, cfg.complexity / 10);
          const laneCount = Math.max(3, Math.round(cfg.symmetry));
          const lane = Math.floor(u * laneCount);
          const laneT = laneCount === 1 ? 0 : lane / (laneCount - 1);
          const side = laneT * 2 - 1;
          const shoulder = w > 0.72;

          const mirror = v > 0.5 ? -1 : 1;

          const roadWidth = R * lerp(0.12, 1.06, near);
          const horizonY = -R * lerp(0.18, 0.32, cfg.glow / 10);
          x =
            side * roadWidth * (shoulder ? 1.05 + (w - 0.72) * 0.8 : 0.72) +
            Math.sin(phase * 2 + q * 20) * R * 0.006 * near;

          y =
            horizonY +
            mirror * R * 1.12 * near +
            Math.sin(u * 20 + phase) * R * 0.008 * near * mirror;

          z = (0.5 - travel) * R * 0.54;
        }

        const force = fingerForce(x, y, z, R);
        arr[i * 3] = x + force.x;
        arr[i * 3 + 1] = y + force.y;
        arr[i * 3 + 2] = z + force.z;
      }

      pos.needsUpdate = true;
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = (1.55 + cfg.luminous * 0.2) * (R / 260);
      mat.opacity = 0.42 + iF * 0.36;
      updateMat(pts, pal.rgb, iF, 2.35 + cfg.luminous * 0.28);
    }

    if (tag === 'depthLineRing') {
      const ringObj = child as THREE.LineSegments;
      const ringIndex = child.userData.ring as number;
      const pos = ringObj.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const travel = (ringIndex / DEPTH_LINE_RINGS + phase * 0.62) % 1;
      const near = travel ** depthPower;
      const baseRadius = vanishing + R * 1.16 * near;
      const twist = phase * 1.6 + travel * TAU * lerp(0.1, 0.7, cfg.glow / 10);

      for (let seg = 0; seg < DEPTH_LINE_SEGMENTS; seg++) {
        const a0 = (seg / DEPTH_LINE_SEGMENTS) * TAU + twist;
        const a1 = ((seg + 1) / DEPTH_LINE_SEGMENTS) * TAU + twist;
        const wob0 = 1 + Math.sin(a0 * 3 + phase + ringIndex) * 0.035 * (cfg.complexity / 10);
        const wob1 = 1 + Math.sin(a1 * 3 + phase + ringIndex) * 0.035 * (cfg.complexity / 10);
        const idx = seg * 6;
        arr[idx] = Math.cos(a0) * baseRadius * wob0;
        arr[idx + 1] = Math.sin(a0) * baseRadius * 0.72 * wob0;
        arr[idx + 2] = (0.5 - travel) * R * 0.65;
        arr[idx + 3] = Math.cos(a1) * baseRadius * wob1;
        arr[idx + 4] = Math.sin(a1) * baseRadius * 0.72 * wob1;
        arr[idx + 5] = (0.5 - travel) * R * 0.65;
      }
      pos.needsUpdate = true;
      updateMat(ringObj, pal.rgb, iF * (0.25 + near * 0.85), 2.0 + cfg.luminous * 0.2);
    }

    if (tag === 'depthLineSpokes') {
      const spokes = child as THREE.LineSegments;
      const spokeCount = Math.max(5, Math.round(cfg.symmetry));
      const pos = spokes.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const far = vanishing + R * 0.08;
      const near = R * 1.18;
      const twist = phase * lerp(0.2, 1.2, cfg.glow / 10);
      for (let i = 0; i < spokeCount; i++) {
        const a = (i / spokeCount) * TAU + twist;
        const idx = i * 6;
        arr[idx] = Math.cos(a) * far;
        arr[idx + 1] = Math.sin(a) * far * 0.72;
        arr[idx + 2] = R * 0.32;
        arr[idx + 3] = Math.cos(a) * near;
        arr[idx + 4] = Math.sin(a) * near * 0.72;
        arr[idx + 5] = -R * 0.36;
      }
      pos.needsUpdate = true;
      updateMat(spokes, pal.rgb, iF * 0.48, 1.8 + cfg.luminous * 0.2);
    }
  }
}

/* Dot-only symbolic forms: warm sun, alchemical sun, and heart */

const DOT_SYMBOL_COUNT = 2400;

function buildDotSymbolField(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const pos = new Float32Array(DOT_SYMBOL_COUNT * 3);
  const seed = new Float32Array(DOT_SYMBOL_COUNT * 4);

  for (let i = 0; i < DOT_SYMBOL_COUNT; i++) {
    seed[i * 4] = Math.random();
    seed[i * 4 + 1] = Math.random();
    seed[i * 4 + 2] = Math.random();
    seed[i * 4 + 3] = i / DOT_SYMBOL_COUNT;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const dots = new THREE.Points(
    geo,
    circlePtsMat(hdrColor(pal.rgb, cfg.intensity / 10, 2.9), 2.2, 0.74),
  );
  dots.userData.tag = 'dotSymbolField';
  group.add(dots);
  return group;
}

function updateDotSymbolField(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const phase = t * 0.001 * cfg.breathSpeed;
  const pulse = 0.5 + 0.5 * Math.sin(phase * 2.2);
  const heat = cfg.intensity / 10;
  const dotLimit = Math.round(lerp(800, DOT_SYMBOL_COUNT, cfg.particles / 10));
  const TAU = Math.PI * 2;

  for (const child of group.children) {
    if (child.userData.tag !== 'dotSymbolField') continue;
    const dots = child as THREE.Points;
    const pos = dots.geometry.getAttribute('position') as THREE.BufferAttribute;
    const seed = dots.geometry.getAttribute('seed') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const sarr = seed.array as Float32Array;

    for (let i = 0; i < DOT_SYMBOL_COUNT; i++) {
      const u = sarr[i * 4];
      const v = sarr[i * 4 + 1];
      const w = sarr[i * 4 + 2];
      const q = sarr[i * 4 + 3];
      let x = 99999;
      let y = 99999;
      let z = 0;

      if (i < dotLimit && cfg.mode === 'missionsun') {
        const a = v * TAU;
        const shell = u > 0.82;
        const coreR = Math.sqrt(shell ? (u - 0.82) / 0.18 : u / 0.82);
        const voice = Math.min(1, _voiceEnergy * 1.25);
        const membraneStrength = cfg.glow / 10;
        const agitation = (cfg.complexity / 10) * (0.42 + voice * 2.15);
        const cellular = Math.sin(a * 13 + phase * 1.2) + Math.sin(a * 7 - phase * 0.9 + w * 6);
        const membrane = shell
          ? 0.985 +
            cellular * 0.012 * membraneStrength +
            voice * Math.sin(a * 23 + phase * 9) * 0.018
          : 1;
        const r = R * (shell ? 0.43 + coreR * 0.035 : coreR * 0.4);
        const swim =
          Math.sin(phase * 1.7 + q * 32 + a * 3) * R * 0.007 * agitation +
          Math.sin(phase * 3.1 + w * 18) * R * 0.007 * voice;
        const jitter =
          Math.sin(phase * 12.5 + q * 47) * R * 0.019 * voice * (0.3 + coreR) +
          Math.cos(phase * 10.7 + w * 29) * R * 0.012 * voice;
        const orbit = shell ? 0 : Math.sin(phase * 0.55 + coreR * 5 + q * 12) * voice * R * 0.011;
        const breathe = 1 + pulse * 0.022 + voice * 0.04;
        x =
          Math.cos(a) * r * membrane * breathe +
          Math.cos(a * 5 + phase) * swim +
          Math.cos(a + Math.PI / 2) * orbit +
          jitter;
        y =
          Math.sin(a) * r * membrane * breathe +
          Math.sin(a * 4 - phase * 1.2) * swim -
          Math.sin(a + Math.PI / 2) * orbit -
          jitter * 0.62;
        z = Math.sin(phase + w * TAU) * R * (0.018 + voice * 0.035);
      } else if (i < dotLimit && cfg.mode === 'dotsunfire') {
        const a = v * TAU;
        const corona = u > 0.72;
        const coreR = Math.sqrt(corona ? (u - 0.72) / 0.28 : u / 0.72);
        const flame =
          Math.sin(a * 9 + phase * 2.1 + w * 7) * 0.04 * cfg.complexity +
          Math.sin(a * 17 - phase * 1.3) * 0.018 * cfg.glow;
        const r = R * (corona ? 0.34 + coreR * (0.22 + cfg.glow * 0.018) : coreR * 0.34);
        const breathe = 1 + pulse * 0.025 + flame;
        x = Math.cos(a) * r * breathe;
        y = Math.sin(a) * r * breathe;
        z = Math.sin(phase + w * TAU) * R * 0.025;
      } else if (i < dotLimit && cfg.mode === 'dotsunoutward') {
        const a = v * TAU;
        const corona = u > 0.68;
        const coreR = Math.sqrt(corona ? (u - 0.68) / 0.32 : u / 0.68);
        const wave = (phase * 0.42 + q) % 1;
        const outward = wave * wave;
        const ripple = Math.max(0, 1 - Math.abs(coreR - outward) * 5.2);
        const flame =
          Math.sin(a * 10 + phase * 1.1 + w * 8) * 0.015 * cfg.complexity +
          Math.sin(a * 21 - phase * 0.75 + q * 5) * 0.012 * cfg.glow;
        const r = R * (corona ? 0.36 + coreR * (0.24 + cfg.glow * 0.012) : coreR * 0.36);
        const push = 1 + outward * 0.1 + ripple * 0.13 + flame;
        x = Math.cos(a) * r * push;
        y = Math.sin(a) * r * push;
        z = Math.sin(a * 3 + phase + w * TAU) * R * 0.018 + ripple * R * 0.035;
      } else if (i < dotLimit && cfg.mode === 'dotalchemicalsun') {
        const rays = Math.max(5, Math.round(cfg.symmetry));
        const rayZone = u > 0.45;
        const ray = Math.floor(v * rays);
        const rayLocal = v * rays - ray;
        const baseA = (ray / rays) * TAU;
        if (rayZone) {
          const length = lerp(0.38, 0.78, cfg.complexity / 10);
          const curve = (cfg.glow / 10 - 0.5) * 0.45;
          const along = (u - 0.45) / 0.55;
          const width = (1 - along) * (0.22 / rays + 0.012) + 0.005;
          const a = baseA + (rayLocal - 0.5) * width * TAU + Math.sin(along * Math.PI) * curve;
          const r = R * (0.27 + along * length);
          x = Math.cos(a) * r;
          y = Math.sin(a) * r;
          z = Math.sin(along * Math.PI + phase + w) * R * 0.025;
        } else {
          const a = v * TAU;
          const r = R * Math.sqrt(u / 0.45) * 0.3 * (1 + pulse * 0.02);
          x = Math.cos(a) * r;
          y = Math.sin(a) * r;
          z = Math.cos(a * 3 + phase) * R * 0.012;
        }
      } else if (i < dotLimit && cfg.mode === 'dotheart') {
        const a = v * TAU;
        const inner = Math.sqrt(u);
        const hx = 16 * Math.sin(a) ** 3;
        const hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        const flow = Math.sin(phase * 1.4 + q * 18) * R * 0.006 * cfg.complexity;
        const scale = R * 0.033 * (0.88 + cfg.glow * 0.018 + pulse * 0.04);
        x = hx * scale * inner + Math.cos(a * 5 + phase) * flow;
        y = (hy * scale - R * 0.06) * inner + Math.sin(a * 4 - phase) * flow;
        z = Math.sin(phase + q * TAU) * R * 0.025;
      } else if (i < dotLimit && cfg.mode === 'dotphoenix') {
        const a = v * TAU;
        const inner = Math.sqrt(u);
        const heartX = 16 * Math.sin(a) ** 3 * R * 0.028 * inner;
        const heartY =
          (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) *
            R *
            0.028 *
            inner -
          R * 0.08;
        const loop = 0.5 + 0.5 * Math.sin(phase * 0.72);
        const bird = smoothstep(Math.min(1, loop * 1.35));
        const flame = smoothstep(Math.max(0, (loop - 0.52) / 0.48));
        const side = v < 0.5 ? -1 : 1;
        const local = (v * 2) % 1;
        const bodySeed = u < 0.28;
        const wingReach = R * lerp(0.28, 0.64, cfg.complexity / 10);
        const wingX = side * (R * 0.07 + local * wingReach);
        const wingY =
          -Math.sin(local * Math.PI) * R * 0.26 +
          (local - 0.5) * R * 0.12 +
          Math.sin(local * 10 + phase * 2.1 + w * 5) * R * 0.018 * (cfg.glow / 10);
        const bodyA = v * TAU;
        const bodyX = Math.cos(bodyA) * R * (0.055 + inner * 0.08);
        const bodyY = Math.sin(bodyA) * R * (0.1 + inner * 0.14) - R * 0.03;
        const birdX = bodySeed ? bodyX : wingX;
        const birdY = bodySeed ? bodyY : wingY;
        const plume = (q + phase * 0.08) % 1;
        const flameWidth = (1 - plume) * R * lerp(0.36, 0.56, cfg.glow / 10);
        const flameX =
          Math.sin(v * TAU * 2.7 + phase * 2.6 + w * 3) * flameWidth +
          side * Math.sin(plume * Math.PI) * R * 0.08;
        const flameY = R * (0.32 - plume * 0.78) + Math.sin(v * TAU + phase) * R * 0.028;
        const phoenixX = lerp(birdX, flameX, flame);
        const phoenixY = lerp(birdY, flameY, flame);
        x = lerp(heartX, phoenixX, bird);
        y = lerp(heartY, phoenixY, bird);
        z = Math.sin(phase * 1.6 + q * TAU) * R * (0.025 + flame * 0.035);
      } else if (i < dotLimit && cfg.mode === 'dotbrain') {
        const loop = 0.5 + 0.5 * Math.sin(phase * 0.62);
        const dream = smoothstep(loop);
        const side = v < 0.5 ? -1 : 1;
        const local = (v * 2) % 1;
        const theta = local * TAU;
        const shell = Math.sqrt(u);
        const lobeX = side * R * (0.12 + 0.24 * shell * Math.abs(Math.cos(theta)));
        const lobeY = Math.sin(theta) * R * (0.31 * shell) + Math.sin(theta * 3) * R * 0.018;
        const crease = -side * R * 0.03 * Math.sin(theta * 2 + phase);
        const fold = Math.sin(theta * 8 + local * 12 + phase * 1.4) * R * 0.025 * (cfg.glow / 10);
        const rationalRow = Math.floor(q * 22);
        const rationalCol = (q * 22 - rationalRow - 0.5) * 2;
        const laneY = (rationalRow / 21 - 0.5) * R * 0.62;
        const laneWidth = Math.sqrt(Math.max(0, 1 - (laneY / (R * 0.34)) ** 2));
        const logicX = side * R * (0.08 + laneWidth * 0.26 * (0.18 + Math.abs(rationalCol)));
        const logicY = laneY + Math.sin(rationalRow + phase * 0.8) * R * 0.008;
        const swirlR = R * (0.06 + shell * 0.3);
        const swirlA = theta + side * phase * 0.7 + Math.sin(shell * 5 + phase) * 0.55;
        const dreamX = side * R * 0.08 + Math.cos(swirlA) * swirlR * 0.78;
        const dreamY = Math.sin(swirlA) * swirlR + Math.sin(swirlA * 3 + phase) * R * 0.025;
        const baseX = lerp(logicX, dreamX, dream);
        const baseY = lerp(logicY, dreamY, dream);
        x = lerp(baseX, lobeX + crease + fold, 0.42);
        y = lerp(baseY, lobeY, 0.42);
        z = Math.sin(theta * 4 + phase + w * TAU) * R * (0.018 + cfg.luminous * 0.004);
      } else if (i < dotLimit && cfg.mode === 'neuronweb') {
        const cells = Math.max(5, Math.round(cfg.symmetry));
        const cell = Math.floor(q * cells);
        const local = q * cells - cell;
        const cellA = (cell / cells) * TAU + Math.sin(phase * 0.18) * 0.08;
        const orbit = R * (0.14 + 0.28 * ((cell * 0.61803398875) % 1));
        const cx = Math.cos(cellA) * orbit;
        const cy = Math.sin(cellA) * orbit * 0.82;
        const branch = Math.floor(v * 5);
        const branchA = cellA + (branch - 2) * 0.42 + Math.sin(phase * 0.33 + cell) * 0.2;
        const soma = u < 0.2;
        if (soma) {
          const a = v * TAU;
          const rr = R * (0.018 + Math.sqrt(u / 0.2) * 0.045);
          x = cx + Math.cos(a) * rr * (1 + pulse * 0.08);
          y = cy + Math.sin(a) * rr * (1 + pulse * 0.08);
        } else {
          const along = (u - 0.2) / 0.8;
          const length = R * lerp(0.12, 0.34, cfg.complexity / 10);
          const curl = Math.sin(along * Math.PI * 2 + phase + w * 8) * R * 0.025;
          x = cx + Math.cos(branchA) * length * along + Math.cos(branchA + Math.PI / 2) * curl;
          y =
            cy + Math.sin(branchA) * length * along * 0.82 + Math.sin(branchA + Math.PI / 2) * curl;
        }
        const signal = Math.max(
          0,
          1 - Math.abs(((phase * 0.18 + cell / cells + local) % 1) - u) * 8,
        );
        z = Math.sin(phase * 1.2 + cell + w * TAU) * R * 0.02 + signal * R * 0.045;
      } else if (i < dotLimit && cfg.mode === 'embrace') {
        const side = q < 0.5 ? -1 : 1;
        const localQ = (q * 2) % 1;
        const a = v * TAU;
        const bodyBreath = 1 + Math.sin(phase * 0.72) * 0.035;
        const closeness = lerp(0.2, 0.1, cfg.glow / 10);
        const centerX = side * R * (closeness + Math.sin(phase * 0.54 + side) * 0.018);
        const centerY = Math.sin(phase * 0.38 + side * 1.4) * R * 0.018;
        let bx = 0;
        let by = 0;

        if (u < 0.12) {
          const r = Math.sqrt(u / 0.12);
          bx = side * R * 0.05 + Math.cos(a) * R * 0.075 * r;
          by = R * 0.31 + Math.sin(a) * R * 0.085 * r;
        } else if (u < 0.52) {
          const p = (u - 0.12) / 0.4;
          const width = R * (0.075 + Math.sin(p * Math.PI) * 0.055);
          bx = side * R * (0.045 - p * 0.07) + Math.cos(a) * width * Math.sin(p * Math.PI);
          by = R * (0.26 - p * 0.58) + Math.sin(a) * R * 0.055 * Math.sin(p * Math.PI);
        } else if (u < 0.82) {
          const p = (u - 0.52) / 0.3;
          const front = w > 0.5;
          const cross = front ? 1 : -1;
          const armArc = Math.sin(p * Math.PI);
          bx =
            side * R * 0.055 -
            side * R * (0.07 + p * 0.3) * (front ? 1 : 0.62) +
            Math.sin(phase + p * Math.PI) * R * 0.025 * cross;
          by =
            R * (0.18 - p * 0.26) +
            armArc * R * (front ? 0.1 : -0.07) +
            Math.sin(localQ * TAU + phase) * R * 0.018;
        } else {
          const p = (u - 0.82) / 0.18;
          const legSide = w > 0.5 ? 1 : -1;
          bx = side * R * (0.02 + p * 0.11) + legSide * R * 0.06 * Math.sin(p * Math.PI);
          by = -R * (0.28 + p * 0.24) + Math.sin(a + phase) * R * 0.035;
        }

        const lean = -side * (0.36 + Math.sin(phase * 0.44) * 0.07);
        const rx = bx * Math.cos(lean) - by * Math.sin(lean);
        const ry = bx * Math.sin(lean) + by * Math.cos(lean);
        const orbit = phase * 0.2 + side * 0.12;
        const swirl =
          Math.sin(a * 2 + phase * 1.2 + localQ * 8) * R * 0.018 * (cfg.complexity / 10);
        x =
          (centerX + rx * bodyBreath) * Math.cos(orbit) -
          (centerY + ry * bodyBreath) * Math.sin(orbit) +
          Math.cos(a + phase) * swirl;
        y =
          (centerX + rx * bodyBreath) * Math.sin(orbit) +
          (centerY + ry * bodyBreath) * Math.cos(orbit) +
          Math.sin(a - phase) * swirl;
        z = Math.sin(phase * 1.25 + a + w * TAU) * R * (0.025 + cfg.luminous * 0.006);
      } else if (i < dotLimit && cfg.mode === 'tripnumber1') {
        const journey = (phase * 0.052) % 1;
        const totalPhases = 10;
        const raw = journey * totalPhases;
        const stage = Math.floor(raw) % totalPhases;
        const blend = smoothstep(raw - Math.floor(raw));
        const a = v * TAU;
        const inner = Math.sqrt(u);

        const shapePoint = (shape: number): [number, number, number] => {
          if (shape === 0) {
            const travel = (q + phase * 0.55) % 1;
            const near = travel ** 1.55;
            const eyeBand = u > 0.18;
            const iris = R * (0.22 + near * 0.7) * (eyeBand ? 1 : 0.1);
            const eyeOpen = 0.28 + near * 0.48;
            return [
              Math.cos(a + phase * 0.22) * iris,
              Math.sin(a) * iris * eyeOpen,
              (0.5 - travel) * R * 0.6,
            ];
          }
          if (shape === 1) {
            const r = R * (0.1 + inner * lerp(0.45, 1.18, cfg.glow / 10));
            const burst = smoothstep((q + phase * 0.18) % 1);
            return [
              Math.cos(a + Math.sin(q * 20) * 0.4) * r * (0.55 + burst),
              Math.sin(a + Math.cos(q * 17) * 0.35) * r * (0.55 + burst),
              Math.sin(a * 3 + phase) * R * 0.08 * burst,
            ];
          }
          if (shape === 2) {
            const side = q % 1 > 0.5 ? 1 : -1;
            const r = R * (0.08 + inner * 0.36);
            const centerY = side * R * 0.17;
            const angle = a + side * phase * 0.55;
            const sCurve = Math.sin(inner * Math.PI) * R * 0.1 * side;
            return [Math.cos(angle) * r + sCurve, centerY + Math.sin(angle) * r, 0];
          }
          if (shape === 3) {
            const r = R * (0.08 + inner * 0.72);
            const spiral = a + inner * TAU * 1.7 + phase * 1.2;
            return [
              Math.cos(spiral) * r,
              Math.sin(spiral) * r * 0.82,
              Math.sin(inner * 8 + phase) * R * 0.05,
            ];
          }
          if (shape === 4) {
            const corona = u > 0.55;
            const core = Math.sqrt(corona ? (u - 0.55) / 0.45 : u / 0.55);
            const r = R * (corona ? 0.24 + core * 0.48 : core * 0.28);
            const flame = Math.sin(a * 9 + phase * 1.5 + w * 6) * R * 0.025 * (corona ? 1 : 0.3);
            return [
              Math.cos(a) * (r + flame),
              Math.sin(a) * (r + flame),
              Math.sin(phase + w * TAU) * R * 0.035,
            ];
          }
          if (shape === 5) {
            const side = v < 0.5 ? -1 : 1;
            const local = (v * 2) % 1;
            const body = u < 0.22;
            const wingX = side * (R * 0.08 + local * R * 0.58);
            const wingY =
              -Math.sin(local * Math.PI) * R * 0.25 + Math.sin(q * 18 + phase) * R * 0.025;
            const bodyX = Math.cos(a) * R * (0.06 + inner * 0.08);
            const bodyY = Math.sin(a) * R * (0.08 + inner * 0.12) - R * 0.03;
            return [
              body ? bodyX : wingX,
              body ? bodyY : wingY,
              Math.sin(phase + q * TAU) * R * 0.04,
            ];
          }
          if (shape === 6) {
            const sides = Math.max(5, Math.round(cfg.symmetry));
            const petal = Math.floor(v * sides);
            const local = v * sides - petal;
            const baseA = (petal / sides) * TAU + phase * 0.18;
            const r = R * (0.16 + inner * 0.48);
            const width = Math.sin(local * Math.PI) * R * 0.12;
            return [
              Math.cos(baseA) * r - Math.sin(baseA) * width,
              Math.sin(baseA) * r + Math.cos(baseA) * width,
              0,
            ];
          }
          if (shape === 7) {
            const ring = Math.floor(u * 7);
            const local = (u * 7) % 1;
            const r = R * (0.1 + ring * 0.075 + local * 0.018);
            return [
              Math.cos(a + ring * 0.2 + phase * 0.16) * r,
              Math.sin(a + ring * 0.2) * r,
              Math.sin(ring + phase) * R * 0.018,
            ];
          }
          if (shape === 8) {
            const travel = (q + phase * 0.38) % 1;
            const near = travel ** 1.5;
            const r = R * (0.08 + near * 0.96);
            return [
              Math.cos(a + near * 1.2) * r,
              Math.sin(a + near * 1.2) * r * 0.72,
              (0.5 - travel) * R * 0.55,
            ];
          }
          const hx = 16 * Math.sin(a) ** 3;
          const hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
          const scale = R * 0.031 * (0.9 + pulse * 0.08);
          return [
            hx * scale * inner,
            (hy * scale - R * 0.06) * inner,
            Math.sin(phase + q * TAU) * R * 0.025,
          ];
        };

        const p1 = shapePoint(stage);
        const p2 = shapePoint((stage + 1) % totalPhases);
        x = lerp(p1[0], p2[0], blend);
        y = lerp(p1[1], p2[1], blend);
        z = lerp(p1[2], p2[2], blend);
      }

      const force = fingerForce(x, y, z, R);
      arr[i * 3] = x + force.x;
      arr[i * 3 + 1] = y + force.y;
      arr[i * 3 + 2] = z + force.z;
    }

    pos.needsUpdate = true;
    const mat = dots.material as THREE.PointsMaterial;
    mat.size = (1.6 + cfg.luminous * 0.18 + pulse * 0.28) * (R / 260);
    mat.opacity = 0.6 + heat * 0.24;
    updateMat(dots, pal.rgb, heat, 2.4 + cfg.luminous * 0.32 + pulse * 0.25);
  }
}

const PULSE_MAX_RINGS = 14;
const PULSE_PTS = 80;
const TRIP2_DUST_POINTS = 520;
const TRIP2_HORIZON_POINTS = 180;

function buildPulse(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const iF = cfg.intensity / 10;
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  for (let ri = 0; ri < PULSE_MAX_RINGS; ri++) {
    const positions = new Float32Array(PULSE_PTS * 3);
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    const pts = new THREE.Points(geo, ptsMat(hdrColor([rr, gg, bb], iF * 0.82, 2.2), 2.2, 0.75));
    pts.userData.tag = 'pulseRing';
    pts.userData.ri = ri;
    group.add(pts);
  }
  if (cfg.mode === 'tripnumber2') {
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(TRIP2_DUST_POINTS * 3);
    const dustSeeds = new Float32Array(TRIP2_DUST_POINTS * 4);
    for (let i = 0; i < TRIP2_DUST_POINTS; i++) {
      dustSeeds[i * 4] = (i * 0.61803398875) % 1;
      dustSeeds[i * 4 + 1] = (i * 0.41421356237) % 1;
      dustSeeds[i * 4 + 2] = (i * 0.73205080757) % 1;
      dustSeeds[i * 4 + 3] = i % 2 === 0 ? 1 : -1;
    }
    const dustAttr = new THREE.BufferAttribute(dustPositions, 3);
    dustAttr.setUsage(THREE.DynamicDrawUsage);
    dustGeo.setAttribute('position', dustAttr);
    dustGeo.setAttribute('seed', new THREE.BufferAttribute(dustSeeds, 4));
    const dust = new THREE.Points(dustGeo, ptsMat(hdrColor(pal.rgb, iF * 0.86, 2.6), 1.7, 0.66));
    dust.userData.tag = 'trip2Dust';
    group.add(dust);

    const horizonGeo = new THREE.BufferGeometry();
    const horizonPositions = new Float32Array(TRIP2_HORIZON_POINTS * 3);
    const horizonAttr = new THREE.BufferAttribute(horizonPositions, 3);
    horizonAttr.setUsage(THREE.DynamicDrawUsage);
    horizonGeo.setAttribute('position', horizonAttr);
    const horizon = new THREE.Points(
      horizonGeo,
      ptsMat(hdrColor(pal.rgb, iF * 0.7, 2.1), 2.0, 0.52),
    );
    horizon.userData.tag = 'trip2Horizon';
    group.add(horizon);
  }
  return group;
}

function updatePulse(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const desertDrop = cfg.mode === 'tripnumber2';
  const soundEnergy = desertDrop ? Math.min(1, _voiceEnergy * 1.55 + _musicPulse * 0.45) : 0;
  const dropPush = desertDrop ? 0.38 + soundEnergy * 0.72 : 0;
  const ringCount = Math.max(2, Math.round(lerp(4, PULSE_MAX_RINGS, iF)));
  const speed = cfg.breathSpeed;
  const chaosAmt = Math.min(1.35, Math.max(0, cfg.complexity - 1) / 9 + dropPush * 0.28);
  const TAU = Math.PI * 2;
  const halfPts = PULSE_PTS >> 1;
  const timeHue = (t * 0.00004) % 1.0;
  const tmpCol = new THREE.Color();
  const sym = cfg.symmetry > 4; // bilateral rorschach mirror
  const dustCount = Math.round(lerp(140, TRIP2_DUST_POINTS, cfg.particles / 10));

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (tag === 'trip2Dust') {
      const pts = child as THREE.Points;
      const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const seedAttr = pts.geometry.getAttribute('seed') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const seeds = seedAttr.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        const u = seeds[i * 4];
        const v = seeds[i * 4 + 1];
        const phase = seeds[i * 4 + 2];
        const side = seeds[i * 4 + 3];
        const fall = (phase + t * 0.00018 * speed * (1 + dropPush)) % 1;
        const spread = R * (0.18 + v * 0.88 + soundEnergy * 0.18);
        const angle = side * (0.18 + u * Math.PI * 0.82);
        const gust = Math.sin(t * 0.0012 * speed + u * 8 + fall * TAU) * R * 0.08 * chaosAmt;
        const lift = Math.sin(fall * Math.PI) * R * (0.16 + soundEnergy * 0.22);
        arr[i * 3] = Math.cos(angle) * spread + gust;
        arr[i * 3 + 1] = -R * 0.44 + fall * R * 1.08 + lift;
        arr[i * 3 + 2] =
          Math.sin(angle * 2.4 + t * 0.001 * speed) * R * (0.08 + soundEnergy * 0.08);
      }
      pts.geometry.setDrawRange(0, dustCount);
      posAttr.needsUpdate = true;
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = (1.1 + cfg.luminous * 0.24 + soundEnergy * 1.2) * (R / 260);
      mat.opacity = Math.min(1, 0.22 + iF * 0.24 + soundEnergy * 0.3);
      updateMat(pts, [255, 168, 82], mat.opacity, 2.2 + cfg.luminous * 0.35 + soundEnergy);
      continue;
    }

    if (tag === 'trip2Horizon') {
      const pts = child as THREE.Points;
      const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < TRIP2_HORIZON_POINTS; i++) {
        const u = i / Math.max(1, TRIP2_HORIZON_POINTS - 1);
        const x = lerp(-R * 1.08, R * 1.08, u);
        const ripple =
          Math.sin(u * Math.PI * Math.max(3, cfg.symmetry) + t * 0.0016 * speed) *
          R *
          0.018 *
          (1 + soundEnergy);
        arr[i * 3] = x;
        arr[i * 3 + 1] = -R * 0.24 + ripple;
        arr[i * 3 + 2] = -R * 0.18 + Math.sin(u * TAU + t * 0.0008 * speed) * R * 0.04;
      }
      posAttr.needsUpdate = true;
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = (1.4 + cfg.luminous * 0.18 + soundEnergy * 0.5) * (R / 260);
      mat.opacity = Math.min(0.82, 0.18 + iF * 0.22 + soundEnergy * 0.24);
      updateMat(pts, [255, 196, 116], mat.opacity, 2.0 + cfg.luminous * 0.25);
      continue;
    }

    if (tag !== 'pulseRing') continue;
    const ri = child.userData.ri as number;
    const pts = child as THREE.Points;
    if (ri >= ringCount) {
      (pts.material as THREE.PointsMaterial).opacity = 0;
      continue;
    }

    const phaseOff = ri / ringCount;
    const phase = (t * 0.00052 * speed * (desertDrop ? 1.18 : 1) + phaseOff) % 1.0;
    // Smooth pulse: expand and contract with ease
    const rFrac = 0.5 - 0.5 * Math.cos(phase * TAU);
    const beatKick = desertDrop ? Math.sin(phase * Math.PI) ** 3 * dropPush : 0;
    const radius = rFrac * R * (0.96 + beatKick * 0.2);
    const opacity = Math.min(1, Math.sin(phase * Math.PI) * iF * (0.88 + dropPush * 0.28));

    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    if (desertDrop) {
      for (let p = 0; p < PULSE_PTS; p++) {
        const a = (p / PULSE_PTS) * TAU;
        const mirrorA = Math.atan2(Math.sin(a), Math.abs(Math.cos(a)));
        const noise =
          Math.sin(mirrorA * 4 + t * 0.00068 * speed + ri * 1.4) * 0.5 +
          Math.sin(mirrorA * 9 + t * 0.00031 * speed + ri * 0.8) * 0.32 +
          Math.sin(mirrorA * 17 + t * 0.00014 * speed) * 0.08;
        const desertLift =
          Math.sin(mirrorA * 2 + t * 0.0011 + ri) * R * 0.026 * (0.35 + soundEnergy);
        const rOff = noise * chaosAmt * R * 0.22 + desertLift;
        const r2 = Math.max(0, radius + rOff);
        const px = Math.cos(a) * r2;
        const py = Math.sin(a) * r2 * (0.86 + beatKick * 0.06);
        const pz = Math.sin(a * 3 + t * 0.001 + ri) * R * 0.035 * soundEnergy;
        const f = fingerForce(px, py, pz, R);
        arr[p * 3] = px + f.x;
        arr[p * 3 + 1] = py + f.y;
        arr[p * 3 + 2] = pz + f.z;
      }
    } else {
      for (let p = 0; p < halfPts; p++) {
        const a = (p / halfPts) * Math.PI; // 0..PI (one side)
        const noise =
          Math.sin(a * 4 + t * 0.00068 * speed + ri * 1.4) * 0.55 +
          Math.sin(a * 9 + t * 0.00031 * speed + ri * 0.8) * 0.35 +
          Math.sin(a * 17 + t * 0.00014 * speed) * 0.1;
        const rOff = sym ? noise * chaosAmt * R * 0.32 : noise * chaosAmt * R * 0.28 * Math.sin(a);
        const r2 = Math.max(0, radius + rOff);
        const ry = Math.sin(a) * r2;
        // Right side
        const rx = Math.cos(a) * r2;
        const fr = fingerForce(rx, ry, 0, R);
        arr[p * 3] = rx + fr.x;
        arr[p * 3 + 1] = ry + fr.y;
        arr[p * 3 + 2] = fr.z;
        // Mirrored left side (rorschach)
        const lx = -Math.cos(a) * r2;
        const fl = fingerForce(lx, ry, 0, R);
        arr[(halfPts + p) * 3] = lx + fl.x;
        arr[(halfPts + p) * 3 + 1] = ry + fl.y;
        arr[(halfPts + p) * 3 + 2] = fl.z;
      }
    }
    posAttr.needsUpdate = true;
    pts.geometry.setDrawRange(0, PULSE_PTS);

    const ringHue = desertDrop
      ? 0.09 + ri * 0.011 + soundEnergy * 0.03
      : ((ri / ringCount) * 0.72 + timeHue) % 1.0;
    tmpCol.setHSL(ringHue, desertDrop ? 0.84 : 0.96, desertDrop ? 0.52 + soundEnergy * 0.12 : 0.54);
    const col: [number, number, number] = [
      lerp(rr, tmpCol.r * 255, glowF),
      lerp(gg, tmpCol.g * 255, glowF),
      lerp(bb, tmpCol.b * 255, glowF),
    ];
    updateMat(pts, col, opacity, 2.4 + (desertDrop ? 0.9 + soundEnergy * 1.8 : 0));
  }
}

/* ── Triangle Yantra Trip ───────────────────────────────────── */
const TRI_YANTRA_MAX_SEGMENTS = 760;
const TRI_YANTRA_DOTS = 960;
const TRI_YANTRA_RAYS = 220;
const TRI_YANTRA_ORBIT_DOTS = 360;

function buildTriangleYantraTrip(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const iF = cfg.intensity / 10;

  const lineGeo = new THREE.BufferGeometry();
  const linePositions = new Float32Array(TRI_YANTRA_MAX_SEGMENTS * 2 * 3);
  const lineAttr = new THREE.BufferAttribute(linePositions, 3);
  lineAttr.setUsage(THREE.DynamicDrawUsage);
  lineGeo.setAttribute('position', lineAttr);
  const lines = new THREE.LineSegments(lineGeo, lineMat(hdrColor(pal.rgb, iF * 0.85, 2.4), 0.78));
  lines.userData.tag = 'triangleYantraLines';
  group.add(lines);

  const dotGeo = new THREE.BufferGeometry();
  const dotPositions = new Float32Array(TRI_YANTRA_DOTS * 3);
  const dotAttr = new THREE.BufferAttribute(dotPositions, 3);
  dotAttr.setUsage(THREE.DynamicDrawUsage);
  dotGeo.setAttribute('position', dotAttr);
  const dots = new THREE.Points(dotGeo, ptsMat(hdrColor(pal.rgb, iF, 2.8), 2.1, 0.78));
  dots.userData.tag = 'triangleYantraDots';
  group.add(dots);

  const rayGeo = new THREE.BufferGeometry();
  const rayPositions = new Float32Array(TRI_YANTRA_RAYS * 2 * 3);
  const rayAttr = new THREE.BufferAttribute(rayPositions, 3);
  rayAttr.setUsage(THREE.DynamicDrawUsage);
  rayGeo.setAttribute('position', rayAttr);
  const rays = new THREE.LineSegments(rayGeo, lineMat(hdrColor(pal.rgb, iF * 0.62, 2.2), 0.38));
  rays.userData.tag = 'triangleYantraRays';
  group.add(rays);

  const orbitGeo = new THREE.BufferGeometry();
  const orbitPositions = new Float32Array(TRI_YANTRA_ORBIT_DOTS * 3);
  const orbitAttr = new THREE.BufferAttribute(orbitPositions, 3);
  orbitAttr.setUsage(THREE.DynamicDrawUsage);
  orbitGeo.setAttribute('position', orbitAttr);
  const orbit = new THREE.Points(orbitGeo, ptsMat(hdrColor(pal.rgb, iF * 0.9, 2.6), 1.6, 0.68));
  orbit.userData.tag = 'triangleYantraOrbit';
  group.add(orbit);

  return group;
}

function updateTriangleYantraTrip(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed;
  const soundEnergy = Math.min(1, _voiceEnergy * 1.3 + _musicPulse * 0.5);
  const beat = 0.5 + 0.5 * Math.sin(t * 0.0046 * speed);
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.00115 * speed + soundEnergy * 1.2);
  const angularHeat = Math.min(1, 0.35 + glowF * 0.45 + soundEnergy * 0.4);
  const TAU = Math.PI * 2;
  const triCount = Math.max(3, Math.round(lerp(4, 14, cfg.complexity / 10)));
  const spokeCount = Math.max(3, Math.round(cfg.symmetry));
  const templeDepth = R * (0.12 + cfg.stars * 0.012 + soundEnergy * 0.07);
  const scalePulse = 1 + pulse * 0.035 + soundEnergy * 0.055;
  const tmpCol = new THREE.Color();
  tmpCol.setHSL(0.085 + glowF * 0.07 + soundEnergy * 0.025, 0.82, 0.54 + soundEnergy * 0.1);
  const col: [number, number, number] = [
    lerp(rr, tmpCol.r * 255, angularHeat),
    lerp(gg, tmpCol.g * 255, angularHeat),
    lerp(bb, tmpCol.b * 255, angularHeat),
  ];

  const lines = group.children.find((child) => child.userData.tag === 'triangleYantraLines') as
    | THREE.LineSegments
    | undefined;
  if (lines) {
    const posAttr = lines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    let seg = 0;
    const addSegment = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => {
      if (seg >= TRI_YANTRA_MAX_SEGMENTS) return;
      const o = seg * 6;
      arr[o] = ax;
      arr[o + 1] = ay;
      arr[o + 2] = az;
      arr[o + 3] = bx;
      arr[o + 4] = by;
      arr[o + 5] = bz;
      seg++;
    };

    for (let layer = 0; layer < triCount; layer++) {
      const frac = layer / Math.max(1, triCount - 1);
      const radius = R * lerp(0.12, 0.82, frac) * scalePulse;
      const spin = t * 0.00022 * speed * (layer % 2 === 0 ? 1 : -1);
      const depth = Math.sin(t * 0.001 * speed + layer * 0.72) * templeDepth * (0.25 + frac);
      const tilt = Math.sin(t * 0.00058 * speed + layer) * R * 0.018;

      for (let invert = 0; invert < 2; invert++) {
        const rot = spin + invert * Math.PI + layer * 0.09 + (invert ? Math.PI / 3 : 0);
        const pts: Array<[number, number, number]> = [];
        for (let p = 0; p < 3; p++) {
          const a = rot + p * (TAU / 3);
          const warp = 1 + Math.sin(a * 3 + t * 0.0014 * speed + layer) * 0.014 * cfg.complexity;
          pts.push([
            Math.cos(a) * radius * warp,
            Math.sin(a) * radius * warp * 0.86,
            depth + Math.cos(a + layer) * tilt,
          ]);
        }
        addSegment(...pts[0], ...pts[1]);
        addSegment(...pts[1], ...pts[2]);
        addSegment(...pts[2], ...pts[0]);
      }

      if (layer % 2 === 0) {
        const sides = 6;
        const rot = -spin * 0.55 + layer * 0.05;
        const hex: Array<[number, number, number]> = [];
        for (let p = 0; p < sides; p++) {
          const a = rot + p * (TAU / sides);
          hex.push([Math.cos(a) * radius * 0.72, Math.sin(a) * radius * 0.62, -depth * 0.35]);
        }
        for (let p = 0; p < sides; p++) addSegment(...hex[p], ...hex[(p + 1) % sides]);
      }
    }

    for (let i = 0; i < spokeCount; i++) {
      const a = i * (TAU / spokeCount) + t * 0.00016 * speed;
      const inner = R * (0.1 + pulse * 0.04);
      const outer = R * (0.9 + soundEnergy * 0.08);
      const z = Math.sin(t * 0.0011 * speed + i) * templeDepth * 0.8;
      addSegment(
        Math.cos(a) * inner,
        Math.sin(a) * inner * 0.86,
        -z,
        Math.cos(a) * outer,
        Math.sin(a) * outer * 0.86,
        z,
      );
    }

    const mat = lines.material as THREE.LineBasicMaterial;
    mat.color.setRGB(
      (col[0] / 255) * (1.1 + iF),
      (col[1] / 255) * (1.1 + iF),
      (col[2] / 255) * (1.1 + iF),
    );
    mat.opacity = Math.min(1, 0.32 + iF * 0.34 + pulse * 0.12 + soundEnergy * 0.18);
    lines.geometry.setDrawRange(0, seg * 2);
    posAttr.needsUpdate = true;
    lines.rotation.z = Math.sin(t * 0.00018 * speed) * 0.06;
    lines.rotation.x = Math.sin(t * 0.00021 * speed) * 0.18;
  }

  const rays = group.children.find((child) => child.userData.tag === 'triangleYantraRays') as
    | THREE.LineSegments
    | undefined;
  if (rays) {
    const posAttr = rays.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const rayCount = Math.min(
      TRI_YANTRA_RAYS,
      Math.round(lerp(42, TRI_YANTRA_RAYS, (cfg.stars + cfg.particles) / 20)),
    );
    for (let i = 0; i < rayCount; i++) {
      const lane = i % spokeCount;
      const band = Math.floor(i / Math.max(1, spokeCount));
      const a = lane * (TAU / spokeCount) + band * 0.037 + t * 0.0001 * speed;
      const flicker = 0.55 + 0.45 * Math.sin(t * 0.0035 * speed + i * 0.7);
      const inner = R * (0.05 + (band % 4) * 0.035 + pulse * 0.025);
      const outer = R * (0.35 + ((band % 9) / 9) * 0.62 + flicker * 0.06 + soundEnergy * 0.08);
      const z0 = -templeDepth * (0.2 + (band % 3) * 0.18);
      const z1 = templeDepth * (0.28 + flicker * 0.72);
      const o = i * 6;
      arr[o] = Math.cos(a) * inner;
      arr[o + 1] = Math.sin(a) * inner * 0.86;
      arr[o + 2] = z0;
      arr[o + 3] = Math.cos(a) * outer;
      arr[o + 4] = Math.sin(a) * outer * 0.86;
      arr[o + 5] = z1;
    }
    rays.geometry.setDrawRange(0, rayCount * 2);
    posAttr.needsUpdate = true;
    const mat = rays.material as THREE.LineBasicMaterial;
    mat.color.setRGB((col[0] / 255) * 1.35, (col[1] / 255) * 1.25, (col[2] / 255) * 1.1);
    mat.opacity = Math.min(0.72, 0.12 + glowF * 0.24 + soundEnergy * 0.22 + pulse * 0.08);
    rays.rotation.z = -t * 0.00008 * speed;
    rays.rotation.x = Math.sin(t * 0.00015 * speed) * 0.1;
  }

  const orbit = group.children.find((child) => child.userData.tag === 'triangleYantraOrbit') as
    | THREE.Points
    | undefined;
  if (orbit) {
    const posAttr = orbit.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const orbitCount = Math.min(
      TRI_YANTRA_ORBIT_DOTS,
      Math.round(lerp(80, TRI_YANTRA_ORBIT_DOTS, cfg.stars / 10)),
    );
    const rings = Math.max(2, Math.round(lerp(2, 6, cfg.glow / 10)));
    for (let i = 0; i < orbitCount; i++) {
      const ring = i % rings;
      const u = i / Math.max(1, orbitCount);
      const a = u * TAU * rings + ring * (TAU / rings) - t * 0.00038 * speed;
      const triSnap = Math.round((u * 3 + t * 0.00008 * speed) % 3) / 3;
      const stepped = lerp(u, triSnap, 0.18 + glowF * 0.28);
      const radius = R * (0.18 + stepped * 0.52 + ring * 0.035 + pulse * 0.018);
      arr[i * 3] = Math.cos(a) * radius;
      arr[i * 3 + 1] = Math.sin(a) * radius * 0.86;
      arr[i * 3 + 2] = Math.sin(a * 3 + t * 0.001 * speed + ring) * templeDepth * 0.65;
    }
    orbit.geometry.setDrawRange(0, orbitCount);
    posAttr.needsUpdate = true;
    const mat = orbit.material as THREE.PointsMaterial;
    mat.size = (1.25 + cfg.luminous * 0.2 + soundEnergy * 0.8) * (R / 260);
    mat.opacity = Math.min(0.95, 0.34 + iF * 0.22 + soundEnergy * 0.2);
    updateMat(orbit, [255, 210, 132], mat.opacity, 2.4 + cfg.luminous * 0.32 + pulse * 0.5);
    orbit.rotation.z = t * 0.00018 * speed;
  }

  const dots = group.children.find((child) => child.userData.tag === 'triangleYantraDots') as
    | THREE.Points
    | undefined;
  if (dots) {
    const posAttr = dots.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const dotCount = Math.min(
      TRI_YANTRA_DOTS,
      Math.round(lerp(320, TRI_YANTRA_DOTS, cfg.particles / 10)),
    );
    for (let i = 0; i < dotCount; i++) {
      const lane = i % Math.max(3, spokeCount);
      const laneF = lane / Math.max(3, spokeCount);
      const crawl = (i / dotCount + t * 0.00012 * speed * (1.1 + soundEnergy)) % 1;
      const side = Math.floor(i / Math.max(3, spokeCount)) % 3;
      const a0 = laneF * TAU + side * (TAU / 3) + t * 0.00026 * speed;
      const snap = Math.round(crawl * 8) / 8;
      const angularSnap = lerp(crawl, snap, 0.38 + glowF * 0.2);
      const rr2 = R * (0.12 + angularSnap * 0.72);
      const flicker = Math.sin(t * 0.004 * speed + i * 0.31) * R * 0.008 * (1 + soundEnergy);
      arr[i * 3] = Math.cos(a0) * rr2 + Math.cos(a0 + Math.PI / 2) * flicker;
      arr[i * 3 + 1] = Math.sin(a0) * rr2 * 0.86 + Math.sin(a0 + Math.PI / 2) * flicker;
      arr[i * 3 + 2] = Math.sin(crawl * TAU + t * 0.0012 * speed + lane) * templeDepth;
    }
    dots.geometry.setDrawRange(0, dotCount);
    posAttr.needsUpdate = true;
    const mat = dots.material as THREE.PointsMaterial;
    mat.size = (1.7 + cfg.luminous * 0.28 + beat * 0.55 + soundEnergy * 1.1) * (R / 260);
    mat.opacity = Math.min(1, 0.5 + iF * 0.22 + soundEnergy * 0.2);
    updateMat(dots, col, mat.opacity, 2.7 + cfg.luminous * 0.4 + soundEnergy * 1.4);
    dots.rotation.z = -t * 0.00012 * speed;
  }
}

const BUDDHA_BOY_POINTS = 1700;
const BUDDHA_BOY_TIDE_POINTS = 900;
const DANCE_MOVES: { key: DanceMove; label: string }[] = [
  { key: 'still', label: 'Still' },
  { key: 'breath', label: 'Breath' },
  { key: 'headnod', label: 'Head Nod' },
  { key: 'armrise', label: 'Arm Rise' },
  { key: 'pulse', label: 'Pulse' },
];

function buildBuddhaBoyCurrents(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const iF = cfg.intensity / 10;

  const bodyGeo = new THREE.BufferGeometry();
  const bodyPositions = new Float32Array(BUDDHA_BOY_POINTS * 3);
  const bodySeeds = new Float32Array(BUDDHA_BOY_POINTS * 3);
  for (let i = 0; i < BUDDHA_BOY_POINTS; i++) {
    const u = i / BUDDHA_BOY_POINTS;
    const zone = u < 0.18 ? 0 : u < 0.48 ? 1 : u < 0.72 ? 2 : 3;
    const a = ((i * 0.61803398875) % 1) * Math.PI * 2;
    const r = Math.sqrt((i * 0.41421356237) % 1);
    bodySeeds[i * 3] = zone;
    bodySeeds[i * 3 + 1] = a;
    bodySeeds[i * 3 + 2] = r;
  }
  const bodyAttr = new THREE.BufferAttribute(bodyPositions, 3);
  bodyAttr.setUsage(THREE.DynamicDrawUsage);
  bodyGeo.setAttribute('position', bodyAttr);
  bodyGeo.setAttribute('seed', new THREE.BufferAttribute(bodySeeds, 3));
  const body = new THREE.Points(bodyGeo, ptsMat(hdrColor(pal.rgb, iF, 2.7), 2.2, 0.82));
  body.userData.tag = 'buddhaBody';
  group.add(body);

  const tideGeo = new THREE.BufferGeometry();
  const tidePositions = new Float32Array(BUDDHA_BOY_TIDE_POINTS * 3);
  const tideSeeds = new Float32Array(BUDDHA_BOY_TIDE_POINTS * 3);
  for (let i = 0; i < BUDDHA_BOY_TIDE_POINTS; i++) {
    tideSeeds[i * 3] = (i * 0.61803398875) % 1;
    tideSeeds[i * 3 + 1] = Math.floor((i / BUDDHA_BOY_TIDE_POINTS) * 9);
    tideSeeds[i * 3 + 2] = Math.random();
  }
  const tideAttr = new THREE.BufferAttribute(tidePositions, 3);
  tideAttr.setUsage(THREE.DynamicDrawUsage);
  tideGeo.setAttribute('position', tideAttr);
  tideGeo.setAttribute('seed', new THREE.BufferAttribute(tideSeeds, 3));
  const tides = new THREE.Points(tideGeo, ptsMat(hdrColor(pal.rgb, iF * 0.75, 2.5), 1.8, 0.72));
  tides.userData.tag = 'buddhaTides';
  group.add(tides);

  return group;
}

function updateBuddhaBoyCurrents(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Golden Source'];
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed;
  const TAU = Math.PI * 2;
  const danceMove = cfg.danceMove ?? 'still';
  const danceAmount = ((cfg.danceAmount ?? 0) / 10) * (danceMove === 'still' ? 0 : 1);
  const beat = beatPulse(t, cfg.danceBpm ?? 92);
  const groove = Math.sin(beatPhase(t, cfg.danceBpm ?? 92) * TAU);
  const danceBreath = danceMove === 'breath' || danceMove === 'pulse' ? beat * danceAmount : 0;
  const breath = 1 + Math.sin(t * 0.0011 * speed) * 0.035 + danceBreath * 0.055;
  const current = cfg.complexity / 10;
  const tideCol = new THREE.Color().setHSL(0.095 + glowF * 0.08, 0.9, 0.58);
  const col: [number, number, number] = [
    lerp(pal.rgb[0], tideCol.r * 255, glowF),
    lerp(pal.rgb[1], tideCol.g * 255, glowF),
    lerp(pal.rgb[2], tideCol.b * 255, glowF),
  ];

  for (const child of group.children) {
    if (child.userData.tag === 'buddhaBody') {
      const pts = child as THREE.Points;
      const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const seed = pts.geometry.getAttribute('seed') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const seeds = seed.array as Float32Array;
      for (let i = 0; i < BUDDHA_BOY_POINTS; i++) {
        const zone = seeds[i * 3];
        const a = seeds[i * 3 + 1];
        const r = seeds[i * 3 + 2];
        let x = 0;
        let y = 0;
        let z = 0;
        if (zone === 0) {
          x = Math.cos(a) * R * 0.12 * r;
          y = R * (0.24 + Math.sin(a) * 0.16 * r);
          z = Math.sin(a) * R * 0.08 * r;
          if (danceMove === 'headnod') {
            const headCenter = R * 0.24;
            const angle = groove * 0.34 * danceAmount;
            const localY = y - headCenter;
            const localZ = z;
            y = headCenter + localY * Math.cos(angle) - localZ * Math.sin(angle);
            z = localZ * Math.cos(angle) + localY * Math.sin(angle);
          }
        } else if (zone === 1) {
          x = Math.cos(a) * R * 0.18 * r;
          y = R * (-0.02 + Math.sin(a) * 0.28 * r);
          z = Math.sin(a) * R * 0.1 * r;
        } else if (zone === 2) {
          const side = Math.sign(Math.cos(a)) || 1;
          x = side * R * (0.16 + r * 0.28);
          y = R * (-0.28 + Math.sin(a) * 0.1 * r);
          z = Math.sin(a) * R * 0.09 * r;
          if (danceMove === 'armrise') {
            y += beat * R * 0.2 * danceAmount;
            x *= 1 - beat * 0.12 * danceAmount;
            z += groove * R * 0.025 * danceAmount;
          }
        } else {
          x = Math.cos(a) * R * 0.42 * r;
          y = R * (-0.34 + Math.sin(a) * 0.12 * r);
          z = Math.sin(a) * R * 0.08 * r;
        }
        const shimmer = Math.sin(t * 0.0016 * speed + x * 0.025 + y * 0.018) * R * 0.008 * current;
        arr[i * 3] = x * breath + shimmer;
        arr[i * 3 + 1] = y * breath;
        arr[i * 3 + 2] = z + shimmer * 0.4;
      }
      pos.needsUpdate = true;
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = (1.8 + cfg.luminous * 0.28 + beat * danceAmount * 0.62) * (R / 260);
      mat.opacity = 0.56 + iF * 0.28 + beat * danceAmount * 0.08;
      updateMat(pts, col, mat.opacity, 2.6 + cfg.luminous * 0.38 + beat * danceAmount * 0.7);
    } else if (child.userData.tag === 'buddhaTides') {
      const pts = child as THREE.Points;
      const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const seed = pts.geometry.getAttribute('seed') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const seeds = seed.array as Float32Array;
      const lanes = Math.max(4, Math.round(cfg.symmetry));
      for (let i = 0; i < BUDDHA_BOY_TIDE_POINTS; i++) {
        const u = (seeds[i * 3] + t * 0.00008 * speed * (0.7 + current)) % 1;
        const lane = seeds[i * 3 + 1] % lanes;
        const drift = seeds[i * 3 + 2];
        const a = u * TAU + lane * (TAU / lanes) + Math.sin(t * 0.00032 * speed + lane) * 0.5;
        const r =
          R *
          (0.35 +
            0.48 * u +
            Math.sin(t * 0.001 * speed + lane) * 0.04 +
            beat * danceAmount * 0.025);
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = Math.sin(a) * r * 0.42 + R * (drift - 0.5) * 0.08;
        arr[i * 3 + 2] = Math.sin(a * 2 + t * 0.001 * speed) * R * 0.12;
      }
      pos.needsUpdate = true;
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = (1.3 + cfg.luminous * 0.22 + beat * danceAmount * 0.35) * (R / 260);
      mat.opacity = 0.36 + iF * 0.28 + beat * danceAmount * 0.08;
      updateMat(pts, col, mat.opacity, 2.3 + cfg.luminous * 0.4 + beat * danceAmount * 0.55);
    }
  }
}

function beatPhase(t: number, bpm: number) {
  return ((t * 0.001 * Math.max(1, bpm)) / 60) % 1;
}

function beatPulse(t: number, bpm: number) {
  return (0.5 - Math.cos(beatPhase(t, bpm) * Math.PI * 2) * 0.5) ** 2.8;
}

/* ── Emotion ────────────────────────────────────────────────── */
function buildEmotion(_cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(R * 0.52, 4);
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
  const orig = new Float32Array(posAttr.array as Float32Array);
  geo.userData.orig = orig;
  (posAttr as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.5, 0.16, 0.2),
    wireframe: true,
    transparent: true,
    opacity: 0.72,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.tag = 'emotionSphere';
  group.add(mesh);

  // Outer halo ring
  const ringGeo = new THREE.RingGeometry(R * 0.62, R * 0.64, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.76, 0.63, 0.38),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.18,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.userData.tag = 'emotionRing';
  group.add(ring);
  return group;
}

function updateEmotion(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  let emoIdx = 4;
  try {
    const v = typeof window !== 'undefined' ? localStorage.getItem('colourmap:process-idx') : null;
    if (v !== null) emoIdx = Math.min(9, Math.max(0, Number(v)));
  } catch {}

  const norm = emoIdx / 9;
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const speed = cfg.breathSpeed * 0.4;
  const noiseAmp = R * lerp(0.42, 0.03, norm);
  const rotSpeed = lerp(0.004, 0.0008, norm) * speed;

  // Agitated color: dark blood red. Calm color: palette color
  const cr = lerp(140, rr, norm);
  const cg = lerp(36, gg, norm);
  const cb = lerp(52, bb, norm);

  for (const child of group.children) {
    if (child.userData.tag === 'emotionSphere') {
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry as THREE.BufferGeometry;
      const orig = geo.userData.orig as Float32Array;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const c = cfg.complexity / 10;

      for (let i = 0; i < arr.length; i += 3) {
        const ox = orig[i],
          oy = orig[i + 1],
          oz = orig[i + 2];
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
        const nx = ox / len,
          ny = oy / len,
          nz = oz / len;
        const noise =
          Math.sin(nx * 5.1 + t * 0.00088 * speed) * 0.5 +
          Math.sin(ny * 7.4 + t * 0.00063 * speed) * 0.32 +
          Math.sin(nz * 11.2 + t * 0.00041 * speed) * 0.18;
        const d = noiseAmp * noise * c;
        arr[i] = ox + nx * d;
        arr[i + 1] = oy + ny * d;
        arr[i + 2] = oz + nz * d;
      }
      posAttr.needsUpdate = true;
      (mesh.material as THREE.MeshBasicMaterial).color.setRGB(cr / 255, cg / 255, cb / 255);
      (mesh.material as THREE.MeshBasicMaterial).opacity = lerp(0.48, 0.76, norm) * iF;
      mesh.rotation.x += rotSpeed * 0.65;
      mesh.rotation.y += rotSpeed;
      mesh.rotation.z += rotSpeed * 0.28;
    }
    if (child.userData.tag === 'emotionRing') {
      const mesh = child as THREE.Mesh;
      (mesh.material as THREE.MeshBasicMaterial).color.setRGB(cr / 255, cg / 255, cb / 255);
      (mesh.material as THREE.MeshBasicMaterial).opacity = lerp(0.08, 0.28, norm) * iF;
      mesh.rotation.z += rotSpeed * 0.2;
    }
  }
}

/* ── Constellation ──────────────────────────────────────────── */
const CONST_NODES = 48;
const CONST_EDGES = 64;

function buildConstellation(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const sym = Math.max(1, cfg.symmetry);
  const nodeCount = Math.max(12, Math.round(CONST_NODES * (cfg.complexity / 10)));

  // Generate node positions
  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const theta = (i / nodeCount) * Math.PI * 2 * sym + Math.random() * 0.4;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = R * (0.3 + Math.random() * 0.62);
    nodes.push(
      new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ),
    );
  }
  group.userData.nodes = nodes;

  // Node points
  const nodePos = new Float32Array(nodeCount * 3);
  nodes.forEach((n, i) => {
    nodePos[i * 3] = n.x;
    nodePos[i * 3 + 1] = n.y;
    nodePos[i * 3 + 2] = n.z;
  });
  const nodeGeo = new THREE.BufferGeometry();
  const nodePosAttr = new THREE.BufferAttribute(nodePos, 3);
  nodePosAttr.setUsage(THREE.DynamicDrawUsage);
  nodeGeo.setAttribute('position', nodePosAttr);
  const nodeMat = new THREE.PointsMaterial({
    size: 3.2,
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.88 * iF,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nodePts = new THREE.Points(nodeGeo, nodeMat);
  nodePts.userData.tag = 'constNodes';
  group.add(nodePts);

  // Edges — connect nearest-ish nodes
  const edgeCount = Math.min(CONST_EDGES, Math.round(nodeCount * 1.4));
  const edgePos = new Float32Array(edgeCount * 2 * 3);
  const used = new Set<string>();
  let ei = 0;
  for (let i = 0; i < nodeCount && ei < edgeCount; i++) {
    // Find closest node not yet connected
    let best = -1,
      bestDist = Infinity;
    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (used.has(key)) continue;
      const d = nodes[i].distanceTo(nodes[j]);
      if (d < bestDist && d < R * 0.85) {
        bestDist = d;
        best = j;
      }
    }
    if (best < 0) continue;
    const key = i < best ? `${i}-${best}` : `${best}-${i}`;
    used.add(key);
    const a = nodes[i],
      b = nodes[best];
    edgePos[ei * 6 + 0] = a.x;
    edgePos[ei * 6 + 1] = a.y;
    edgePos[ei * 6 + 2] = a.z;
    edgePos[ei * 6 + 3] = b.x;
    edgePos[ei * 6 + 4] = b.y;
    edgePos[ei * 6 + 5] = b.z;
    ei++;
  }
  const edgeGeo = new THREE.BufferGeometry();
  const edgePosAttr = new THREE.BufferAttribute(edgePos.slice(0, ei * 6), 3);
  edgePosAttr.setUsage(THREE.DynamicDrawUsage);
  edgeGeo.setAttribute('position', edgePosAttr);
  edgeGeo.setDrawRange(0, ei * 2);
  const edgeMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.22 * iF,
    blending: THREE.AdditiveBlending,
  });
  const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
  edgeLines.userData.tag = 'constEdges';
  group.add(edgeLines);

  return group;
}

function updateConstellation(group: THREE.Group, cfg: Cfg, t: number, _R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const speed = cfg.breathSpeed * 0.00028;
  const nodes = group.userData.nodes as THREE.Vector3[] | undefined;
  if (!nodes) return;

  for (const child of group.children) {
    if (child.userData.tag === 'constNodes') {
      const pts = child as THREE.Points;
      const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      nodes.forEach((n, i) => {
        const drift = Math.sin(t * speed + i * 1.7) * 3.5;
        arr[i * 3] = n.x + Math.cos(t * speed * 0.7 + i) * drift;
        arr[i * 3 + 1] = n.y + Math.sin(t * speed * 0.9 + i * 1.3) * drift;
        arr[i * 3 + 2] = n.z + Math.cos(t * speed * 0.5 + i * 0.8) * drift;
      });
      posAttr.needsUpdate = true;
      (pts.material as THREE.PointsMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (pts.material as THREE.PointsMaterial).opacity = 0.88 * iF;
    }
    if (child.userData.tag === 'constEdges') {
      const lines = child as THREE.LineSegments;
      (lines.material as THREE.LineBasicMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (lines.material as THREE.LineBasicMaterial).opacity = 0.22 * iF;
    }
  }
  // Slow steady rotation
  group.rotation.y += 0.0018;
  group.rotation.x += 0.0006;
}

/* ── Drift — nodes breathe through noise-space, edges rebuild ── */
function buildDrift(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const n = Math.max(20, Math.round(28 + cfg.complexity * 3.5));

  const seeds: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = R * (0.18 + Math.random() ** 0.6 * 0.72);
    seeds.push(
      new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ),
    );
  }
  group.userData.seeds = seeds;
  group.userData.n = n;

  // Node points — positions updated each frame
  const nodePos = new Float32Array(n * 3);
  seeds.forEach((s, i) => {
    nodePos[i * 3] = s.x;
    nodePos[i * 3 + 1] = s.y;
    nodePos[i * 3 + 2] = s.z;
  });
  const nGeo = new THREE.BufferGeometry();
  const nAttr = new THREE.BufferAttribute(nodePos, 3);
  nAttr.setUsage(THREE.DynamicDrawUsage);
  nGeo.setAttribute('position', nAttr);
  const nMat = new THREE.PointsMaterial({
    size: 3.8,
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.92 * iF,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nPts = new THREE.Points(nGeo, nMat);
  nPts.userData.tag = 'driftNodes';
  group.add(nPts);

  // Edge line pool — enough slots for n*(n-1)/2 pairs, draw subset
  const MAX_E = Math.min(n * 4, 120);
  const ePos = new Float32Array(MAX_E * 2 * 3);
  const eGeo = new THREE.BufferGeometry();
  const eAttr = new THREE.BufferAttribute(ePos, 3);
  eAttr.setUsage(THREE.DynamicDrawUsage);
  eGeo.setAttribute('position', eAttr);
  eGeo.setDrawRange(0, 0);
  const eMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.28 * iF,
    blending: THREE.AdditiveBlending,
  });
  const eLines = new THREE.LineSegments(eGeo, eMat);
  eLines.userData.tag = 'driftEdges';
  eLines.userData.maxE = MAX_E;
  group.add(eLines);
  return group;
}

function updateDrift(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const speed = cfg.breathSpeed * 0.00022;
  _musicPulse *= 0.95;
  _musicBass *= 0.972;
  _musicDrums *= 0.91;
  _musicPads *= 0.986;
  _musicKeys *= 0.978;
  _musicLead *= 0.925;
  const beatPhase = (t / 1000) * Math.PI * 2 * (_musicBpm / 60);
  const internalPulse = ((Math.sin(beatPhase) + 1) / 2) ** 3 * 0.2;
  const impact = Math.min(1, internalPulse + _musicDrums * 0.5 + _musicPulse * 0.42);
  const pressure = Math.min(1, _musicBass * 0.86 + internalPulse * 0.25);
  const atmosphere = Math.min(1, _musicPads * 0.58 + _musicKeys * 0.36 + internalPulse * 0.16);
  const amp = R * 0.14 * (cfg.complexity / 10) * (1 + pressure * 0.48 + atmosphere * 0.22);
  const seeds = group.userData.seeds as THREE.Vector3[];
  const n = group.userData.n as number;
  if (!seeds) return;

  // Compute live positions
  const live: THREE.Vector3[] = seeds.map(
    (s, i) =>
      new THREE.Vector3(
        s.x * (1 + pressure * 0.08) + Math.sin(t * speed * 1.1 + i * 2.3 + 0.7 + impact) * amp,
        s.y * (1 + pressure * 0.08) + Math.cos(t * speed * 0.9 + i * 1.7 + 1.3 + atmosphere) * amp,
        s.z * (1 + atmosphere * 0.18) + Math.sin(t * speed * 0.7 + i * 1.1 + 2.1) * amp,
      ),
  );

  for (const child of group.children) {
    if (child.userData.tag === 'driftNodes') {
      const pts = child as THREE.Points;
      const arr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      live.forEach((v, i) => {
        arr[i * 3] = v.x;
        arr[i * 3 + 1] = v.y;
        arr[i * 3 + 2] = v.z;
      });
      (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (pts.material as THREE.PointsMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (pts.material as THREE.PointsMaterial).opacity = 0.82 * iF + atmosphere * 0.18;
      (pts.material as THREE.PointsMaterial).size = 3.8 + impact * 2.2 + _musicLead * 1.3;
    }
    if (child.userData.tag === 'driftEdges') {
      const lines = child as THREE.LineSegments;
      const maxE = child.userData.maxE as number;
      const arr = (lines.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      // Connect nearest pairs within threshold
      const thresh = R * (0.58 + pressure * 0.12 + atmosphere * 0.08);
      let ei = 0;
      for (let a = 0; a < n && ei < maxE; a++) {
        for (let b = a + 1; b < n && ei < maxE; b++) {
          if (live[a].distanceTo(live[b]) < thresh) {
            arr[ei * 6 + 0] = live[a].x;
            arr[ei * 6 + 1] = live[a].y;
            arr[ei * 6 + 2] = live[a].z;
            arr[ei * 6 + 3] = live[b].x;
            arr[ei * 6 + 4] = live[b].y;
            arr[ei * 6 + 5] = live[b].z;
            ei++;
          }
        }
      }
      (lines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      lines.geometry.setDrawRange(0, ei * 2);
      (lines.material as THREE.LineBasicMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (lines.material as THREE.LineBasicMaterial).opacity =
        0.18 * iF + atmosphere * 0.12 + impact * 0.08;
    }
  }
  group.rotation.y += 0.0014 + impact * 0.0008;
  group.rotation.x += 0.0005 + atmosphere * 0.0004;
}

/* ── CBloom — rings of nodes pulse outward like petals ───────── */
function buildCBloom(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const rings = Math.max(3, Math.round(cfg.symmetry * 0.7));
  const perRing = Math.max(6, Math.round(cfg.complexity * 1.4));
  const total = rings * perRing + 1; // +1 for center

  const rPos = new Float32Array(total * 3);
  const rCol = new Float32Array(total * 3);
  const rGeo = new THREE.BufferGeometry();
  const rPosAttr = new THREE.BufferAttribute(rPos, 3);
  rPosAttr.setUsage(THREE.DynamicDrawUsage);
  const rColAttr = new THREE.BufferAttribute(rCol, 3);
  rColAttr.setUsage(THREE.DynamicDrawUsage);
  rGeo.setAttribute('position', rPosAttr);
  rGeo.setAttribute('color', rColAttr);
  const rMat = new THREE.PointsMaterial({
    size: 8,
    map: getCircleTex(),
    vertexColors: true,
    transparent: true,
    opacity: 0.88 * iF,
    sizeAttenuation: false,
    alphaTest: 0.01,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rPts = new THREE.Points(rGeo, rMat);
  rPts.userData.tag = 'bloomNodes';
  rPts.userData.rings = rings;
  rPts.userData.perRing = perRing;
  group.add(rPts);

  // Spoke edges center → ring nodes
  const spokePos = new Float32Array(perRing * 2 * 3);
  const sGeo = new THREE.BufferGeometry();
  const sPosAttr = new THREE.BufferAttribute(spokePos, 3);
  sPosAttr.setUsage(THREE.DynamicDrawUsage);
  sGeo.setAttribute('position', sPosAttr);
  sGeo.setDrawRange(0, perRing * 2);
  const sMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.18 * iF,
    blending: THREE.AdditiveBlending,
  });
  const sLines = new THREE.LineSegments(sGeo, sMat);
  sLines.userData.tag = 'bloomSpokes';
  group.add(sLines);
  return group;
}

function updateCBloom(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const speed = cfg.breathSpeed;
  const tmpCol = new THREE.Color();
  const timeHue = (t * 0.000032) % 1.0;
  const glowF = cfg.glow / 10;

  for (const child of group.children) {
    if (child.userData.tag === 'bloomNodes') {
      const pts = child as THREE.Points;
      const rings = child.userData.rings as number;
      const perRing = child.userData.perRing as number;
      const pAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const cAttr = pts.geometry.getAttribute('color') as THREE.BufferAttribute;
      const pArr = pAttr.array as Float32Array;
      const cArr = cAttr.array as Float32Array;

      // Center
      pArr[0] = 0;
      pArr[1] = 0;
      pArr[2] = 0;
      cArr[0] = rr / 255;
      cArr[1] = gg / 255;
      cArr[2] = bb / 255;

      for (let ri = 0; ri < rings; ri++) {
        const baseR = R * (0.18 + (ri / (rings - 1)) * 0.72);
        const pulse = Math.sin(t * 0.00065 * speed + ri * Math.PI * 0.5) * 0.18;
        const radius = baseR * (1 + pulse);
        const tiltZ = ri * 0.28; // z-depth per ring
        const ringRot = t * 0.0002 * speed * (ri % 2 === 0 ? 1 : -1) * (ri + 1) * 0.4;

        for (let ni = 0; ni < perRing; ni++) {
          const angle = (ni / perRing) * Math.PI * 2 + ringRot;
          const idx = 1 + ri * perRing + ni;
          pArr[idx * 3] = Math.cos(angle) * radius;
          pArr[idx * 3 + 1] = Math.sin(angle) * radius;
          pArr[idx * 3 + 2] = tiltZ * Math.sin(angle * 2);

          const h = (timeHue + (ri / rings) * 0.8 + (ni / perRing) * 0.2) % 1.0;
          tmpCol.setHSL(h, 0.95, 0.6);
          const bright = 0.55 + 0.45 * ((rings - ri) / rings);
          cArr[idx * 3] = lerp(rr / 255, tmpCol.r, glowF) * bright;
          cArr[idx * 3 + 1] = lerp(gg / 255, tmpCol.g, glowF) * bright;
          cArr[idx * 3 + 2] = lerp(bb / 255, tmpCol.b, glowF) * bright;
        }
      }
      pAttr.needsUpdate = true;
      cAttr.needsUpdate = true;
      pts.geometry.setDrawRange(0, 1 + rings * perRing);
      (pts.material as THREE.PointsMaterial).opacity = 0.88 * iF;
    }
    if (child.userData.tag === 'bloomSpokes') {
      const lines = child as THREE.LineSegments;
      (lines.material as THREE.LineBasicMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (lines.material as THREE.LineBasicMaterial).opacity = 0.16 * iF;
    }
  }
  group.rotation.y += 0.0012;
  group.rotation.z += 0.0004;
}

/* ── Orbit — nodes orbit 4 gravity wells (EMBF axes) ─────────── */
const ORBIT_WELLS = 4;
function buildOrbit(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const n = Math.max(12, Math.round(cfg.complexity * 5));

  // Gravity well positions (tetrahedral)
  const wellPos = [
    new THREE.Vector3(R * 0.45, R * 0.45, R * 0.45),
    new THREE.Vector3(-R * 0.45, -R * 0.45, R * 0.45),
    new THREE.Vector3(R * 0.45, -R * 0.45, -R * 0.45),
    new THREE.Vector3(-R * 0.45, R * 0.45, -R * 0.45),
  ];
  group.userData.wellPos = wellPos;

  // Node orbital params: [wellIdx, radius, phase, inclination, speed]
  const orbits: number[][] = [];
  for (let i = 0; i < n; i++) {
    orbits.push([
      i % ORBIT_WELLS,
      R * (0.12 + Math.random() * 0.38),
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI,
      (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1),
    ]);
  }
  group.userData.orbits = orbits;
  group.userData.n = n;

  const nodePos = new Float32Array(n * 3);
  const nodeCol = new Float32Array(n * 3);
  const nGeo = new THREE.BufferGeometry();
  const nPosAttr = new THREE.BufferAttribute(nodePos, 3);
  nPosAttr.setUsage(THREE.DynamicDrawUsage);
  const nColAttr = new THREE.BufferAttribute(nodeCol, 3);
  nColAttr.setUsage(THREE.DynamicDrawUsage);
  nGeo.setAttribute('position', nPosAttr);
  nGeo.setAttribute('color', nColAttr);
  const nMat = new THREE.PointsMaterial({
    size: 4.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.9 * iF,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nPts = new THREE.Points(nGeo, nMat);
  nPts.userData.tag = 'orbitNodes';
  group.add(nPts);

  // Well markers
  const wPos = new Float32Array(ORBIT_WELLS * 3);
  wellPos.forEach((w, wi) => {
    wPos[wi * 3] = w.x;
    wPos[wi * 3 + 1] = w.y;
    wPos[wi * 3 + 2] = w.z;
  });
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  const wMat = new THREE.PointsMaterial({
    size: 7,
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.6 * iF,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const wPts = new THREE.Points(wGeo, wMat);
  wPts.userData.tag = 'orbitWells';
  group.add(wPts);

  // Edge trails between same-well nodes
  const MAX_E = n * 2;
  const ePos = new Float32Array(MAX_E * 2 * 3);
  const eGeo = new THREE.BufferGeometry();
  const ePosAttr = new THREE.BufferAttribute(ePos, 3);
  ePosAttr.setUsage(THREE.DynamicDrawUsage);
  eGeo.setAttribute('position', ePosAttr);
  eGeo.setDrawRange(0, 0);
  const eMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.2 * iF,
    blending: THREE.AdditiveBlending,
  });
  const eLines = new THREE.LineSegments(eGeo, eMat);
  eLines.userData.tag = 'orbitEdges';
  eLines.userData.maxE = MAX_E;
  group.add(eLines);
  return group;
}

// Axis colors: Emotion=gold, Mind=lavender, Body=teal, Focus=green
const WELL_COLORS = [
  [196, 160, 96],
  [184, 152, 208],
  [120, 192, 168],
  [136, 208, 152],
] as const;

function updateOrbit(group: THREE.Group, cfg: Cfg, t: number, _R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Blue Astral'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed * 0.001;
  const wellPos = group.userData.wellPos as THREE.Vector3[];
  const orbits = group.userData.orbits as number[][];
  const n = group.userData.n as number;
  if (!orbits) return;

  // Compute live node positions
  const live: THREE.Vector3[] = orbits.map((o) => {
    const [wi, r, phase, incl, spd] = o;
    const well = wellPos[wi];
    const angle = phase + t * speed * spd;
    return new THREE.Vector3(
      well.x + r * Math.cos(angle) * Math.sin(incl),
      well.y + r * Math.sin(angle) * Math.sin(incl),
      well.z + r * Math.cos(incl),
    );
  });

  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    if (child.userData.tag === 'orbitNodes') {
      const pts = child as THREE.Points;
      const pArr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      const cArr = (pts.geometry.getAttribute('color') as THREE.BufferAttribute)
        .array as Float32Array;
      live.forEach((v, i) => {
        pArr[i * 3] = v.x;
        pArr[i * 3 + 1] = v.y;
        pArr[i * 3 + 2] = v.z;
        const wi = orbits[i][0];
        const wc = WELL_COLORS[wi];
        tmpCol.setHSL((t * 0.000015 + wi * 0.25) % 1.0, 0.9, 0.58);
        cArr[i * 3] = lerp(wc[0] / 255, tmpCol.r, glowF);
        cArr[i * 3 + 1] = lerp(wc[1] / 255, tmpCol.g, glowF);
        cArr[i * 3 + 2] = lerp(wc[2] / 255, tmpCol.b, glowF);
      });
      (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (pts.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
      pts.geometry.setDrawRange(0, n);
      (pts.material as THREE.PointsMaterial).opacity = 0.9 * iF;
    }
    if (child.userData.tag === 'orbitWells') {
      (child as THREE.Points).material &&
        ((child as THREE.Points).material as THREE.PointsMaterial).color.setRGB(
          rr / 255,
          gg / 255,
          bb / 255,
        );
    }
    if (child.userData.tag === 'orbitEdges') {
      const lines = child as THREE.LineSegments;
      const maxE = child.userData.maxE as number;
      const arr = (lines.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      const thresh = orbits[0]?.[1] * 2.2 || 60;
      let ei = 0;
      for (let a = 0; a < n && ei < maxE; a++) {
        const wa = orbits[a][0];
        for (let b = a + 1; b < n && ei < maxE; b++) {
          if (orbits[b][0] === wa && live[a].distanceTo(live[b]) < thresh) {
            arr[ei * 6 + 0] = live[a].x;
            arr[ei * 6 + 1] = live[a].y;
            arr[ei * 6 + 2] = live[a].z;
            arr[ei * 6 + 3] = live[b].x;
            arr[ei * 6 + 4] = live[b].y;
            arr[ei * 6 + 5] = live[b].z;
            ei++;
          }
        }
      }
      (lines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      lines.geometry.setDrawRange(0, ei * 2);
      (lines.material as THREE.LineBasicMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (lines.material as THREE.LineBasicMaterial).opacity = 0.2 * iF;
    }
  }
  group.rotation.y += 0.001;
  group.rotation.x += 0.0004;
}

/* ── Weave — nodes flow in interlocking sinusoidal paths ─────── */
function buildWeave(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Violet Portal'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const strands = Math.max(3, Math.round(cfg.symmetry * 0.6));
  const perStrand = Math.max(8, Math.round(cfg.complexity * 2.2));
  const total = strands * perStrand;

  const nodePos = new Float32Array(total * 3);
  const nodeCol = new Float32Array(total * 3);
  const nGeo = new THREE.BufferGeometry();
  const nPosAttr = new THREE.BufferAttribute(nodePos, 3);
  nPosAttr.setUsage(THREE.DynamicDrawUsage);
  const nColAttr = new THREE.BufferAttribute(nodeCol, 3);
  nColAttr.setUsage(THREE.DynamicDrawUsage);
  nGeo.setAttribute('position', nPosAttr);
  nGeo.setAttribute('color', nColAttr);
  const nMat = new THREE.PointsMaterial({
    size: 3.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.86 * iF,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nPts = new THREE.Points(nGeo, nMat);
  nPts.userData.tag = 'weaveNodes';
  nPts.userData.strands = strands;
  nPts.userData.perStrand = perStrand;
  group.add(nPts);

  // Strand lines (consecutive nodes per strand)
  const linePos = new Float32Array((perStrand - 1) * strands * 2 * 3);
  const lGeo = new THREE.BufferGeometry();
  const lAttr = new THREE.BufferAttribute(linePos, 3);
  lAttr.setUsage(THREE.DynamicDrawUsage);
  lGeo.setAttribute('position', lAttr);
  lGeo.setDrawRange(0, (perStrand - 1) * strands * 2);
  const lMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.3 * iF,
    blending: THREE.AdditiveBlending,
  });
  const lLines = new THREE.LineSegments(lGeo, lMat);
  lLines.userData.tag = 'weaveLines';
  group.add(lLines);
  return group;
}

function updateWeave(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Violet Portal'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const glowF = cfg.glow / 10;
  const speed = cfg.breathSpeed * 0.00055;
  const timeHue = (t * 0.000025) % 1.0;
  const tmpCol = new THREE.Color();

  for (const child of group.children) {
    if (child.userData.tag === 'weaveNodes') {
      const pts = child as THREE.Points;
      const strands = child.userData.strands as number;
      const perStrand = child.userData.perStrand as number;
      const pArr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      const cArr = (pts.geometry.getAttribute('color') as THREE.BufferAttribute)
        .array as Float32Array;

      for (let si = 0; si < strands; si++) {
        const strandAngle = (si / strands) * Math.PI * 2;
        const freqA = 1.5 + si * 0.7;
        const freqB = 2.0 + si * 0.5;
        for (let ni = 0; ni < perStrand; ni++) {
          const u = (ni / (perStrand - 1)) * Math.PI * 4;
          const phase = strandAngle + t * speed;
          const x = Math.cos(strandAngle) * R * 0.7 + Math.cos(u * freqA + phase) * R * 0.22;
          const y = Math.sin(u * 0.5 + phase * 0.7) * R * 0.68;
          const z = Math.sin(strandAngle) * R * 0.7 + Math.sin(u * freqB + phase * 0.8) * R * 0.22;
          const idx = si * perStrand + ni;
          pArr[idx * 3] = x;
          pArr[idx * 3 + 1] = y;
          pArr[idx * 3 + 2] = z;
          const h = (timeHue + (si / strands) * 0.9 + (ni / perStrand) * 0.1) % 1.0;
          tmpCol.setHSL(h, 0.92, 0.56);
          cArr[idx * 3] = lerp(rr / 255, tmpCol.r, glowF);
          cArr[idx * 3 + 1] = lerp(gg / 255, tmpCol.g, glowF);
          cArr[idx * 3 + 2] = lerp(bb / 255, tmpCol.b, glowF);
        }
      }
      (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (pts.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
      pts.geometry.setDrawRange(0, strands * perStrand);
      (pts.material as THREE.PointsMaterial).opacity = 0.86 * iF;
    }
    if (child.userData.tag === 'weaveLines') {
      const lines = child as THREE.LineSegments;
      const strands =
        ((group.children.find((c) => c.userData.tag === 'weaveNodes') as THREE.Points | undefined)
          ?.userData.strands as number) ?? 4;
      const perStrand =
        ((group.children.find((c) => c.userData.tag === 'weaveNodes') as THREE.Points | undefined)
          ?.userData.perStrand as number) ?? 8;
      const pArr = (lines.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      const nodePArr = (
        (
          group.children.find((c) => c.userData.tag === 'weaveNodes') as THREE.Points
        ).geometry.getAttribute('position') as THREE.BufferAttribute
      ).array as Float32Array;
      let ei = 0;
      for (let si = 0; si < strands; si++) {
        for (let ni = 0; ni < perStrand - 1; ni++) {
          const a = si * perStrand + ni,
            b = a + 1;
          pArr[ei * 6 + 0] = nodePArr[a * 3];
          pArr[ei * 6 + 1] = nodePArr[a * 3 + 1];
          pArr[ei * 6 + 2] = nodePArr[a * 3 + 2];
          pArr[ei * 6 + 3] = nodePArr[b * 3];
          pArr[ei * 6 + 4] = nodePArr[b * 3 + 1];
          pArr[ei * 6 + 5] = nodePArr[b * 3 + 2];
          ei++;
        }
      }
      (lines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      lines.geometry.setDrawRange(0, ei * 2);
      (lines.material as THREE.LineBasicMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (lines.material as THREE.LineBasicMaterial).opacity = 0.3 * iF;
    }
  }
  group.rotation.y += 0.0016;
  group.rotation.x += 0.0007;
}

/* ── Chaos Triangle 3D — floating triangles in 3D chaos drift ── */
const TRI3D_N = 120;

function buildChaostri3d(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const spherical = cfg.mode === 'chaostrisphere';
  const triCount = spherical ? 180 : TRI3D_N;
  const sz = R * (spherical ? 0.036 : 0.055);

  // N individual triangle meshes stored in a single instanced mesh
  const triGeo = new THREE.BufferGeometry();
  triGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([0, sz, 0, -sz * 0.86, -sz * 0.5, 0, sz * 0.86, -sz * 0.5, 0]),
      3,
    ),
  );
  triGeo.setIndex([0, 1, 2]);
  triGeo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.55 * iF,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const seeds: Float32Array = new Float32Array(triCount * 8); // x,y,z,vx,vy,vz,theta,phi
  for (let i = 0; i < triCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = spherical ? R * (0.47 + Math.random() * 0.05) : R * (0.15 + Math.random() * 0.75);
    seeds[i * 8 + 0] = Math.sin(phi) * Math.cos(theta) * r;
    seeds[i * 8 + 1] = Math.sin(phi) * Math.sin(theta) * r;
    seeds[i * 8 + 2] = Math.cos(phi) * r;
    seeds[i * 8 + 3] = (Math.random() - 0.5) * 0.012;
    seeds[i * 8 + 4] = (Math.random() - 0.5) * 0.012;
    seeds[i * 8 + 5] = (Math.random() - 0.5) * 0.012;
    seeds[i * 8 + 6] = theta;
    seeds[i * 8 + 7] = phi;
  }

  for (let i = 0; i < triCount; i++) {
    const mesh = new THREE.Mesh(triGeo, mat);
    mesh.position.set(seeds[i * 8], seeds[i * 8 + 1], seeds[i * 8 + 2]);
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
    mesh.userData.tag = 'tri3d';
    mesh.userData.seed = i;
    group.add(mesh);
  }
  group.userData.seeds = seeds;
  group.userData.spherical = spherical;
  return group;
}

function updateChaostri3d(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const speed = cfg.breathSpeed * 0.6;
  const seeds = group.userData.seeds as Float32Array;
  const spherical = group.userData.spherical === true;
  const noiseAmp = R * 0.28 * (cfg.complexity / 10);

  for (const child of group.children) {
    if (child.userData.tag !== 'tri3d') continue;
    const mesh = child as THREE.Mesh;
    const i = child.userData.seed as number;
    const tx = t * 0.00045 * speed + i * 0.37;
    const ty = t * 0.00038 * speed + i * 0.53;
    const tz = t * 0.00031 * speed + i * 0.71;
    if (spherical) {
      const theta = seeds[i * 8 + 6] + Math.sin(tx) * 0.08 + t * 0.00008 * speed;
      const phi = seeds[i * 8 + 7] + Math.cos(ty) * 0.06;
      const shell =
        R *
        (0.5 +
          Math.sin(tz + Math.cos(theta * 3)) * 0.035 * (cfg.complexity / 10) +
          Math.sin(t * 0.001 * cfg.breathSpeed + i) * 0.015);
      mesh.position.x = Math.sin(phi) * Math.cos(theta) * shell;
      mesh.position.y = Math.sin(phi) * Math.sin(theta) * shell;
      mesh.position.z = Math.cos(phi) * shell;
      mesh.lookAt(0, 0, 0);
    } else {
      mesh.position.x = seeds[i * 8] + Math.sin(tx + Math.cos(ty) * 0.7) * noiseAmp;
      mesh.position.y = seeds[i * 8 + 1] + Math.cos(ty + Math.sin(tz) * 0.7) * noiseAmp;
      mesh.position.z = seeds[i * 8 + 2] + Math.sin(tz + Math.cos(tx) * 0.7) * noiseAmp;
    }
    mesh.rotation.x += 0.006 * speed * (seeds[i * 8 + 3] > 0 ? 1 : -1);
    mesh.rotation.y += 0.008 * speed * (seeds[i * 8 + 4] > 0 ? 1 : -1);
    mesh.rotation.z += 0.004 * speed;
    (mesh.material as THREE.MeshBasicMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.45 * iF;
  }
  group.rotation.y += 0.0012;
  group.rotation.x += 0.0004;
}

/* ── Tree of Life 2D — Sephirot tree with pulsing energy dots ─── */

// 10 sephirot + optional Da'at at normalized coords (x ∈ [-1,1], y ∈ [-1,1])
const TOL_NODES = [
  { id: 0, name: 'Kether', x: 0.0, y: 0.92 },
  { id: 1, name: 'Chokmah', x: 0.46, y: 0.6 },
  { id: 2, name: 'Binah', x: -0.46, y: 0.6 },
  { id: 3, name: 'Chesed', x: 0.46, y: 0.18 },
  { id: 4, name: 'Geburah', x: -0.46, y: 0.18 },
  { id: 5, name: 'Tiphareth', x: 0.0, y: 0.0 },
  { id: 6, name: 'Netzach', x: 0.46, y: -0.38 },
  { id: 7, name: 'Hod', x: -0.46, y: -0.38 },
  { id: 8, name: 'Yesod', x: 0.0, y: -0.65 },
  { id: 9, name: 'Malkuth', x: 0.0, y: -0.92 },
];

const TOL_EDGES = [
  [0, 1],
  [0, 2],
  [0, 5],
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 4],
  [3, 5],
  [4, 5],
  [3, 6],
  [4, 7],
  [5, 6],
  [5, 7],
  [5, 8],
  [6, 7],
  [6, 8],
  [7, 8],
  [8, 9],
  [1, 5],
  [2, 5],
];

// Pulse path: Malkuth → Yesod → Hod/Netzach → Tiphareth → Geburah/Chesed → Binah/Chokmah → Kether
const TOL_PULSE_PATH = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

function buildTreeoflife(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const symF = cfg.symmetry / 10; // x-spread factor
  const cplxF = cfg.complexity / 10; // y-stretch (top vs bottom)

  function nodeXY(node: (typeof TOL_NODES)[0]) {
    // symmetry stretches x, complexity shifts top/bottom balance
    const x = node.x * R * 0.72 * symF;
    const yBias = node.y > 0 ? cplxF : 2 - cplxF;
    const y = -node.y * R * 0.72 * yBias * 0.5;
    return { x, y };
  }

  // Edge lines
  const edgePositions = new Float32Array(TOL_EDGES.length * 4 * 3);
  let ei = 0;
  for (const [a, b] of TOL_EDGES) {
    const pa = nodeXY(TOL_NODES[a]);
    const pb = nodeXY(TOL_NODES[b]);
    edgePositions[ei++] = pa.x;
    edgePositions[ei++] = pa.y;
    edgePositions[ei++] = 0;
    edgePositions[ei++] = pb.x;
    edgePositions[ei++] = pb.y;
    edgePositions[ei++] = 0;
  }
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
  eGeo.setDrawRange(0, TOL_EDGES.length * 2);
  const eMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.28 * iF,
    blending: THREE.AdditiveBlending,
  });
  const eLines = new THREE.LineSegments(eGeo, eMat);
  eLines.userData.tag = 'tolEdges';
  group.add(eLines);

  // Node circles (rings)
  for (const node of TOL_NODES) {
    const { x, y } = nodeXY(node);
    const r =
      node.id === 0 ? R * 0.068 : node.id === 9 ? R * 0.074 : node.id === 5 ? R * 0.062 : R * 0.05;
    const pts = 32;
    const circPos = new Float32Array(pts * 3);
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      circPos[i * 3] = x + Math.cos(a) * r;
      circPos[i * 3 + 1] = y + Math.sin(a) * r;
      circPos[i * 3 + 2] = 0;
    }
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.BufferAttribute(circPos, 3));
    const cMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(rr / 255, gg / 255, bb / 255),
      transparent: true,
      opacity: 0.55 * iF,
      blending: THREE.AdditiveBlending,
    });
    const circ = new THREE.LineLoop(cGeo, cMat);
    circ.userData.tag = 'tolNode';
    circ.userData.nodeId = node.id;
    group.add(circ);
  }

  // Pulse dots (points moving up the tree)
  const PULSE_N = 24;
  const pPos = new Float32Array(PULSE_N * 3);
  const pGeo = new THREE.BufferGeometry();
  const pAttr = new THREE.BufferAttribute(pPos, 3);
  pAttr.setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute('position', pAttr);
  pGeo.setDrawRange(0, PULSE_N);
  const pMat = new THREE.PointsMaterial({
    size: 5,
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.9 * iF,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pPts = new THREE.Points(pGeo, pMat);
  pPts.userData.tag = 'tolPulse';
  group.add(pPts);

  group.userData.cfg_sym = symF;
  group.userData.cfg_cplx = cplxF;
  return group;
}

function updateTreeoflife(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const speed = cfg.breathSpeed;
  const symF = cfg.symmetry / 10;
  const cplxF = cfg.complexity / 10;

  function nodeXY(node: (typeof TOL_NODES)[0]) {
    const x = node.x * R * 0.72 * symF;
    const yBias = node.y > 0 ? cplxF : 2 - cplxF;
    const y = -node.y * R * 0.72 * yBias * 0.5;
    return { x, y };
  }

  const pathPositions = TOL_PULSE_PATH.map((id) => nodeXY(TOL_NODES[id]));
  const pathLen = pathPositions.length - 1;

  for (const child of group.children) {
    if (child.userData.tag === 'tolEdges') {
      // Rebuild edges when sym/cplx change
      const lines = child as THREE.LineSegments;
      const pArr = (lines.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      let ei = 0;
      for (const [a, b] of TOL_EDGES) {
        const pa = nodeXY(TOL_NODES[a]);
        const pb = nodeXY(TOL_NODES[b]);
        pArr[ei++] = pa.x;
        pArr[ei++] = pa.y;
        pArr[ei++] = 0;
        pArr[ei++] = pb.x;
        pArr[ei++] = pb.y;
        pArr[ei++] = 0;
      }
      (lines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (lines.material as THREE.LineBasicMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (lines.material as THREE.LineBasicMaterial).opacity = 0.28 * iF;
    }
    if (child.userData.tag === 'tolNode') {
      const nodeId = child.userData.nodeId as number;
      const node = TOL_NODES[nodeId];
      const { x, y } = nodeXY(node);
      const loop = child as THREE.LineLoop;
      const r =
        nodeId === 0 ? R * 0.068 : nodeId === 9 ? R * 0.074 : nodeId === 5 ? R * 0.062 : R * 0.05;
      // pulse brightness at each node when a dot passes through
      const pArr = (loop.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        pArr[i * 3] = x + Math.cos(a) * r;
        pArr[i * 3 + 1] = y + Math.sin(a) * r;
      }
      (loop.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      const bright = 0.45 + 0.5 * Math.abs(Math.sin(t * 0.0008 * speed + nodeId * 0.7));
      (loop.material as THREE.LineBasicMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (loop.material as THREE.LineBasicMaterial).opacity = bright * iF;
    }
    if (child.userData.tag === 'tolPulse') {
      const pts = child as THREE.Points;
      const pArr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      const PULSE_N = 24;
      for (let pi = 0; pi < PULSE_N; pi++) {
        const phase = (t * 0.00055 * speed + pi / PULSE_N) % 1.0;
        const seg = phase * pathLen;
        const segIdx = Math.min(pathLen - 1, Math.floor(seg));
        const frac = seg - segIdx;
        const pa = pathPositions[segIdx];
        const pb = pathPositions[segIdx + 1];
        pArr[pi * 3] = pa.x + (pb.x - pa.x) * frac;
        pArr[pi * 3 + 1] = pa.y + (pb.y - pa.y) * frac;
        pArr[pi * 3 + 2] = 0;
      }
      (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (pts.material as THREE.PointsMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (pts.material as THREE.PointsMaterial).opacity = 0.9 * iF;
    }
  }
}

/* ── Tree of Life 3D — sephirot tree in depth with 3D orbit ───── */

function buildTreeoflife3d(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const symF = cfg.symmetry / 10;
  const cplxF = cfg.complexity / 10;

  // 3D positions: pillars at different Z depths
  // Left pillar: Z = -R*0.18, Center: Z = 0, Right pillar: Z = R*0.18
  function nodeXYZ(node: (typeof TOL_NODES)[0]) {
    const x = node.x * R * 0.68 * symF;
    const yBias = node.y > 0 ? cplxF : 2 - cplxF;
    const y = -node.y * R * 0.68 * yBias * 0.5;
    // Left column (x<-0.2): z = -R*0.22, Right: z = R*0.22, Center: z=0
    const z = node.x < -0.2 ? -R * 0.22 : node.x > 0.2 ? R * 0.22 : 0;
    return { x, y, z };
  }

  // Edges
  const edgePositions = new Float32Array(TOL_EDGES.length * 2 * 3);
  let ei = 0;
  for (const [a, b] of TOL_EDGES) {
    const pa = nodeXYZ(TOL_NODES[a]);
    const pb = nodeXYZ(TOL_NODES[b]);
    edgePositions[ei++] = pa.x;
    edgePositions[ei++] = pa.y;
    edgePositions[ei++] = pa.z;
    edgePositions[ei++] = pb.x;
    edgePositions[ei++] = pb.y;
    edgePositions[ei++] = pb.z;
  }
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
  eGeo.setDrawRange(0, TOL_EDGES.length * 2);
  const eMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.3 * iF,
    blending: THREE.AdditiveBlending,
  });
  const eLines = new THREE.LineSegments(eGeo, eMat);
  eLines.userData.tag = 'tol3dEdges';
  group.add(eLines);

  // Node spheres (small icosahedra)
  for (const node of TOL_NODES) {
    const pos = nodeXYZ(node);
    const r =
      node.id === 0 ? R * 0.065 : node.id === 9 ? R * 0.07 : node.id === 5 ? R * 0.06 : R * 0.048;
    const sGeo = new THREE.IcosahedronGeometry(r, 1);
    const sMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(rr / 255, gg / 255, bb / 255),
      wireframe: true,
      transparent: true,
      opacity: 0.5 * iF,
      blending: THREE.AdditiveBlending,
    });
    const sphere = new THREE.Mesh(sGeo, sMat);
    sphere.position.set(pos.x, pos.y, pos.z);
    sphere.userData.tag = 'tol3dNode';
    sphere.userData.nodeId = node.id;
    group.add(sphere);
  }

  // Pulse dots
  const PULSE_N = 30;
  const pPos = new Float32Array(PULSE_N * 3);
  const pGeo = new THREE.BufferGeometry();
  const pAttr = new THREE.BufferAttribute(pPos, 3);
  pAttr.setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute('position', pAttr);
  pGeo.setDrawRange(0, PULSE_N);
  const pMat = new THREE.PointsMaterial({
    size: 6,
    color: new THREE.Color(rr / 255, gg / 255, bb / 255),
    transparent: true,
    opacity: 0.9 * iF,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pPts = new THREE.Points(pGeo, pMat);
  pPts.userData.tag = 'tol3dPulse';
  group.add(pPts);

  return group;
}

function updateTreeoflife3d(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const speed = cfg.breathSpeed;
  const symF = cfg.symmetry / 10;
  const cplxF = cfg.complexity / 10;

  function nodeXYZ(node: (typeof TOL_NODES)[0]) {
    const x = node.x * R * 0.68 * symF;
    const yBias = node.y > 0 ? cplxF : 2 - cplxF;
    const y = -node.y * R * 0.68 * yBias * 0.5;
    const z = node.x < -0.2 ? -R * 0.22 : node.x > 0.2 ? R * 0.22 : 0;
    return { x, y, z };
  }

  const pathPositions = TOL_PULSE_PATH.map((id) => nodeXYZ(TOL_NODES[id]));
  const pathLen = pathPositions.length - 1;

  for (const child of group.children) {
    if (child.userData.tag === 'tol3dEdges') {
      const lines = child as THREE.LineSegments;
      const pArr = (lines.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      let ei = 0;
      for (const [a, b] of TOL_EDGES) {
        const pa = nodeXYZ(TOL_NODES[a]);
        const pb = nodeXYZ(TOL_NODES[b]);
        pArr[ei++] = pa.x;
        pArr[ei++] = pa.y;
        pArr[ei++] = pa.z;
        pArr[ei++] = pb.x;
        pArr[ei++] = pb.y;
        pArr[ei++] = pb.z;
      }
      (lines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (lines.material as THREE.LineBasicMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (lines.material as THREE.LineBasicMaterial).opacity = 0.3 * iF;
    }
    if (child.userData.tag === 'tol3dNode') {
      const nodeId = child.userData.nodeId as number;
      const node = TOL_NODES[nodeId];
      const pos = nodeXYZ(node);
      child.position.set(pos.x, pos.y, pos.z);
      const bright = 0.38 + 0.52 * Math.abs(Math.sin(t * 0.0009 * speed + nodeId * 0.7));
      (child as THREE.Mesh).rotation.y += 0.008;
      (child as THREE.Mesh).rotation.x += 0.005;
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setRGB(
        rr / 255,
        gg / 255,
        bb / 255,
      );
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = bright * iF;
    }
    if (child.userData.tag === 'tol3dPulse') {
      const pts = child as THREE.Points;
      const pArr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array;
      const PULSE_N = 30;
      for (let pi = 0; pi < PULSE_N; pi++) {
        const phase = (t * 0.0006 * speed + pi / PULSE_N) % 1.0;
        const seg = phase * pathLen;
        const segIdx = Math.min(pathLen - 1, Math.floor(seg));
        const frac = seg - segIdx;
        const pa = pathPositions[segIdx];
        const pb = pathPositions[segIdx + 1];
        pArr[pi * 3] = pa.x + (pb.x - pa.x) * frac;
        pArr[pi * 3 + 1] = pa.y + (pb.y - pa.y) * frac;
        pArr[pi * 3 + 2] = pa.z + (pb.z - pa.z) * frac;
      }
      (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (pts.material as THREE.PointsMaterial).color.setRGB(rr / 255, gg / 255, bb / 255);
      (pts.material as THREE.PointsMaterial).opacity = 0.9 * iF;
    }
  }
  group.rotation.y += 0.001;
}

/* ── Breath / Stream — canvas-only modes ─────────────────────── */
// Most canvas modes use only the 2D overlay. Music Entropy/Nebula also get
// a subtle Three.js dot volume so they read as spatial, not flat.
function buildCanvasMode(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  if (cfg.mode !== 'musicdots' && cfg.mode !== 'musicnebula') return group;

  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const iF = cfg.intensity / 10;
  const count = Math.max(520, Math.round(lerp(900, 2200, cfg.complexity / 10)));
  const positions = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  const arms = cfg.mode === 'musicnebula' ? 3 : Math.max(5, Math.round(cfg.symmetry));

  for (let i = 0; i < count; i++) {
    const p = (i + 0.5) / count;
    const arm = i % arms;
    const a = (arm / arms) * Math.PI * 2 + p * Math.PI * (cfg.mode === 'musicnebula' ? 5.2 : 2.8);
    const r = R * (0.05 + p ** 0.62 * 0.86);
    const z = (Math.sin(p * Math.PI * 2 * arms) + (Math.random() - 0.5)) * R * 0.16;
    const x = Math.cos(a) * r + (Math.random() - 0.5) * R * 0.035;
    const y =
      Math.sin(a) * r * (cfg.mode === 'musicnebula' ? 0.58 : 0.82) +
      (Math.random() - 0.5) * R * 0.035;
    positions[i * 3] = base[i * 3] = x;
    positions[i * 3 + 1] = base[i * 3 + 1] = y;
    positions[i * 3 + 2] = base[i * 3 + 2] = z;
  }

  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(positions, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  const pts = new THREE.Points(geo, circlePtsMat(hdrColor(pal.rgb, iF, 2.3), 1.75, 0.34));
  pts.userData.tag = 'musicDotVolume';
  pts.userData.count = count;
  pts.userData.base = base;
  group.add(pts);
  return group;
}
function updateCanvasMode(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  if (cfg.mode !== 'musicdots' && cfg.mode !== 'musicnebula') return;
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const iF = cfg.intensity / 10;
  const beatPhase = (t / 1000) * Math.PI * 2 * (_musicBpm / 60);
  const beat = Math.min(1, ((Math.sin(beatPhase) + 1) / 2) ** 3 * 0.28 + _musicPulse * 0.82);
  const bass = Math.min(1, _musicBass + beat * 0.18);
  const haze = Math.min(1, _musicPads * 0.7 + _musicKeys * 0.3 + beat * 0.12);

  for (const child of group.children) {
    if ((child.userData.tag as string) !== 'musicDotVolume') continue;
    const pts = child as THREE.Points;
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const base = child.userData.base as Float32Array;
    const count = child.userData.count as number;
    for (let i = 0; i < count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const z = base[i * 3 + 2];
      const r = Math.sqrt(x * x + y * y) + 1;
      const a = Math.atan2(y, x) + t * 0.00008 * cfg.breathSpeed + bass * 0.08;
      const pulse = 1 + bass * 0.12 + Math.sin(beatPhase - r * 0.025 + (i % 11)) * beat * 0.035;
      arr[i * 3] = Math.cos(a) * r * pulse;
      arr[i * 3 + 1] = Math.sin(a) * r * pulse * (cfg.mode === 'musicnebula' ? 0.58 : 0.82);
      arr[i * 3 + 2] = z + Math.sin(beatPhase * 0.5 + r * 0.01) * R * 0.045 * haze;
    }
    posAttr.needsUpdate = true;
    updateMat(pts, pal.rgb, iF, 2.25 + beat * 0.9 + haze * 0.45);
    const mat = pts.material as THREE.PointsMaterial;
    mat.size = 1.55 + beat * 1.2 + _musicLead * 0.8;
    mat.opacity = 0.24 + haze * 0.22 + beat * 0.14;
  }
  group.rotation.y = Math.sin(t * 0.00012) * 0.18;
}

/* ── Entropy 3D — characters floating as sprites in 3D volume ─── */
const _ENTROPY_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZΩπ∞∑∮√∆ψφλμσεδγβα∀∃∈'.split('');

function _makeCharTexture(
  ch: string,
  rr: number,
  gg: number,
  bb: number,
  alpha: number,
  fontSize: number,
): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(${rr},${gg},${bb},${alpha.toFixed(2)})`;
  ctx.fillText(ch, 32, 32);
  return new THREE.CanvasTexture(cv);
}

function buildEntropy3D(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const N = Math.round(60 + cfg.complexity * 10);

  // Three concentric particle shells for clear 3D depth
  const shells = [
    { frac: 0.28, count: Math.round(N * 0.25), size: 4.8, alpha: 0.92, tag: 'inner' },
    { frac: 0.58, count: Math.round(N * 0.45), size: 3.2, alpha: 0.72, tag: 'mid' },
    { frac: 0.88, count: Math.round(N * 0.3), size: 2.0, alpha: 0.46, tag: 'outer' },
  ];

  for (const shell of shells) {
    const cnt = shell.count;
    const positions = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      // Slightly flatten on Z to emphasise the toroidal ring band visually
      const r = R * (shell.frac + (Math.random() - 0.5) * 0.12);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      positions[i * 3 + 2] = Math.cos(phi) * r * 0.55;
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    const mat = circlePtsMat(
      hdrColor([rr, gg, bb], shell.alpha * iF, 1.6),
      shell.size,
      shell.alpha * iF,
    );
    const pts = new THREE.Points(geo, mat);
    pts.userData.tag = shell.tag;
    pts.userData.baseAlpha = shell.alpha * iF;
    group.add(pts);
  }

  // Wireframe meridians (great circle arcs)
  const lineSegs = 56;
  for (let li = 0; li < 8; li++) {
    const a = (li / 8) * Math.PI * 2;
    const linePos = new Float32Array(lineSegs * 3);
    for (let p = 0; p < lineSegs; p++) {
      const phi2 = (p / (lineSegs - 1)) * Math.PI;
      const rad = R * 0.72;
      linePos[p * 3] = Math.sin(phi2) * Math.cos(a) * rad;
      linePos[p * 3 + 1] = Math.sin(phi2) * Math.sin(a) * rad;
      linePos[p * 3 + 2] = Math.cos(phi2) * rad * 0.55;
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lm = new THREE.Line(lineGeo, lineMat(hdrColor([rr, gg, bb], iF * 0.1, 1.4), 0.5));
    lm.userData.tag = 'meridian';
    group.add(lm);
  }

  // Latitude rings (equatorial bands)
  for (const latFrac of [0.35, 0.58, 0.76]) {
    const latN = 64;
    const latPos = new Float32Array(latN * 3);
    for (let p = 0; p < latN; p++) {
      const a2 = (p / (latN - 1)) * Math.PI * 2;
      latPos[p * 3] = Math.cos(a2) * R * latFrac;
      latPos[p * 3 + 1] = Math.sin(a2) * R * latFrac;
      latPos[p * 3 + 2] = 0;
    }
    const latGeo = new THREE.BufferGeometry();
    latGeo.setAttribute('position', new THREE.BufferAttribute(latPos, 3));
    const latLine = new THREE.LineLoop(
      latGeo,
      lineMat(hdrColor([rr, gg, bb], iF * 0.15, 1.4), 0.6),
    );
    latLine.userData.tag = 'latband';
    group.add(latLine);
  }

  return group;
}

function updateEntropy3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const spd = cfg.breathSpeed;
  const glowF = cfg.glow / 10;

  for (const child of group.children) {
    const tag = child.userData.tag as string;

    if (tag === 'inner') {
      const pts = child as THREE.Points;
      const mat = pts.material as THREE.PointsMaterial;
      const pulse = 0.72 + 0.28 * Math.sin(t * 0.0014 * spd);
      mat.opacity = (child.userData.baseAlpha as number) * pulse;
      mat.size = (4.8 + glowF * 2) * (0.88 + 0.12 * pulse);
      mat.color.setRGB(rr / 255, gg / 255, bb / 255);
      child.rotation.y += 0.0009 * spd;
    } else if (tag === 'mid') {
      const pts = child as THREE.Points;
      const mat = pts.material as THREE.PointsMaterial;
      const pulse = 0.8 + 0.2 * Math.sin(t * 0.0009 * spd + 1.1);
      mat.opacity = (child.userData.baseAlpha as number) * pulse;
      mat.color.setRGB(rr / 255, gg / 255, bb / 255);
      child.rotation.x += 0.0005 * spd;
    } else if (tag === 'outer') {
      const pts = child as THREE.Points;
      const mat = pts.material as THREE.PointsMaterial;
      mat.opacity = (child.userData.baseAlpha as number) * 0.6;
      mat.color.setRGB(rr / 255, gg / 255, bb / 255);
      child.rotation.z += 0.0003 * spd;
    } else if (tag === 'meridian' || tag === 'latband') {
      const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
      mat.opacity = iF * (tag === 'latband' ? 0.15 : 0.1) * (0.5 + 0.5 * glowF);
      mat.color.setRGB(rr / 255, gg / 255, bb / 255);
    }
  }

  group.rotation.y += 0.0004;
  void R;
}

/* ── EMBF 3D — arc slices matching the life-map ring ─────────── */

function getEmbfValues(): [number, number, number, number] {
  if (typeof window === 'undefined') return [0.5, 0.5, 0.5, 0.5];
  const clamp = (v: number, mx: number) => Math.max(0.04, Math.min(1, v / mx));
  return [
    clamp(Number(localStorage.getItem('colourmap:process-idx') || '4'), 9),
    clamp(Number(localStorage.getItem('colourmap:presence-idx') || '3'), 5),
    clamp(Number(localStorage.getItem('colourmap:body-idx') || '3'), 7),
    clamp(Number(localStorage.getItem('colourmap:focus-idx') || '3'), 7),
  ];
}

// Arc geometry mirrors the life-map ring layout
const _EMBF_R_FRAC = [0.3, 0.44, 0.58, 0.7];
const _EMBF_START = [-90, 0, 90, 180]; // degrees — same quadrants as MiniRing
const _EMBF_SPAN = 78; // degrees per arc — same as MiniRing QUAD_DEG
const _EMBF_ARC_PTS = 130; // dense enough to look solid

function buildEmbf3D(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const iF = cfg.intensity / 10;

  for (let ai = 0; ai < 4; ai++) {
    const [rr2, gg2, bb2] = WELL_COLORS[ai];
    const ringR = R * _EMBF_R_FRAC[ai];
    const startDeg = _EMBF_START[ai];
    // Slight Z offset per ring so rotation reveals depth
    const zOff = ai * R * 0.055;

    // Pre-compute arc positions (ordered start→end for setDrawRange fill)
    const positions = new Float32Array(_EMBF_ARC_PTS * 3);
    for (let i = 0; i < _EMBF_ARC_PTS; i++) {
      const deg = startDeg + (i / (_EMBF_ARC_PTS - 1)) * _EMBF_SPAN;
      const rad = (deg * Math.PI) / 180;
      positions[i * 3] = Math.cos(rad) * ringR;
      positions[i * 3 + 1] = Math.sin(rad) * ringR;
      positions[i * 3 + 2] = zOff;
    }

    // Dim track (full arc)
    const trackGeo = new THREE.BufferGeometry();
    trackGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    const track = new THREE.Points(
      trackGeo,
      circlePtsMat(hdrColor([rr2, gg2, bb2], iF * 0.18, 1.3), 5, 0.18 * iF),
    );
    track.userData.tag = 'embfTrack';
    group.add(track);

    // Bright fill arc — setDrawRange drives the fill level
    const fillGeo = new THREE.BufferGeometry();
    const fillAttr = new THREE.BufferAttribute(positions.slice(), 3);
    fillAttr.setUsage(THREE.DynamicDrawUsage);
    fillGeo.setAttribute('position', fillAttr);
    fillGeo.setDrawRange(0, 0);
    const fill = new THREE.Points(
      fillGeo,
      circlePtsMat(hdrColor([rr2, gg2, bb2], iF * 0.9, 1.8), 5.5, 0.88 * iF),
    );
    fill.userData.tag = 'embfFill';
    fill.userData.ai = ai;
    fill.userData.baseAlpha = 0.88 * iF;
    group.add(fill);

    // Tip glow — one large dot at the live arc endpoint
    const tipGeo = new THREE.BufferGeometry();
    const tipAttr = new THREE.BufferAttribute(new Float32Array(3), 3);
    tipAttr.setUsage(THREE.DynamicDrawUsage);
    tipGeo.setAttribute('position', tipAttr);
    tipGeo.setDrawRange(0, 0);
    const tip = new THREE.Points(tipGeo, circlePtsMat(hdrColor([rr2, gg2, bb2], iF, 2.2), 12, iF));
    tip.userData.tag = 'embfTip';
    tip.userData.ai = ai;
    tip.userData.ringR = ringR;
    tip.userData.zOff = zOff;
    group.add(tip);
  }

  // Centre dot — pulses with average value
  const centGeo = new THREE.BufferGeometry();
  centGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const cent = new THREE.Points(centGeo, circlePtsMat(new THREE.Color(1, 0.97, 0.9), 8, 0.75 * iF));
  cent.userData.tag = 'embfCenter';
  group.add(cent);

  return group;
}

function updateEmbf3D(group: THREE.Group, cfg: Cfg, t: number, _R: number): void {
  const iF = cfg.intensity / 10;
  const spd = cfg.breathSpeed;
  const glowF = cfg.glow / 10;
  const vals = getEmbfValues();

  for (const child of group.children) {
    const tag = child.userData.tag as string;

    if (tag === 'embfFill') {
      const ai = child.userData.ai as number;
      const val = vals[ai];
      const pts = child as THREE.Points;
      const mat = pts.material as THREE.PointsMaterial;
      pts.geometry.setDrawRange(0, Math.max(1, Math.round(_EMBF_ARC_PTS * val)));
      const pulse = 0.84 + 0.16 * Math.sin(t * 0.0012 * spd + ai * 0.85);
      mat.opacity = (child.userData.baseAlpha as number) * pulse;
      mat.size = 5.5 + glowF * 2.5 + val * 1.5;
    } else if (tag === 'embfTip') {
      const ai = child.userData.ai as number;
      const val = vals[ai];
      const pts = child as THREE.Points;
      const mat = pts.material as THREE.PointsMaterial;
      if (val < 0.05) {
        pts.geometry.setDrawRange(0, 0);
      } else {
        const tipDeg = _EMBF_START[ai] + val * _EMBF_SPAN;
        const tipRad = (tipDeg * Math.PI) / 180;
        const arr = (pts.geometry.getAttribute('position') as THREE.BufferAttribute)
          .array as Float32Array;
        arr[0] = Math.cos(tipRad) * (child.userData.ringR as number);
        arr[1] = Math.sin(tipRad) * (child.userData.ringR as number);
        arr[2] = child.userData.zOff as number;
        (pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        pts.geometry.setDrawRange(0, 1);
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.002 * spd + ai * 1.1);
        mat.opacity = iF * pulse;
        mat.size = 12 + glowF * 4;
      }
    } else if (tag === 'embfTrack') {
      ((child as THREE.Points).material as THREE.PointsMaterial).opacity = 0.18 * iF;
    } else if (tag === 'embfCenter') {
      const avg = (vals[0] + vals[1] + vals[2] + vals[3]) / 4;
      const pulse = 0.6 + 0.4 * Math.sin(t * 0.002 * spd);
      const mat = (child as THREE.Points).material as THREE.PointsMaterial;
      mat.opacity = 0.75 * iF * pulse * (0.3 + 0.7 * avg);
      mat.size = 8 + glowF * 3;
    }
  }
}

/* ── Sacred Pyramid 3D ──────────────────────────────────────── */

function buildPyramid3D(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const PHI = 1.6180339887;

  // Three concentric Merkaba pairs (up + down tetrahedra) at golden ratio scales
  const scales = [0.38, 0.38 * PHI, 0.38 * PHI * PHI];
  scales.forEach((sc, si) => {
    const sz = R * sc;
    // Up-pointing tetrahedron (wireframe)
    const tetUp = new THREE.Mesh(
      new THREE.TetrahedronGeometry(sz, 0),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(rr / 255, gg / 255, bb / 255),
        wireframe: true,
        transparent: true,
        opacity: (0.55 - si * 0.1) * iF,
      }),
    );
    tetUp.userData.tag = `tetUp-${si}`;
    tetUp.userData.scaleIdx = si;
    group.add(tetUp);

    // Down-pointing tetrahedron (rotated 180° on X)
    const tetDown = new THREE.Mesh(
      new THREE.TetrahedronGeometry(sz * 0.92, 0),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(rr / 255, gg / 255, bb / 255),
        wireframe: true,
        transparent: true,
        opacity: (0.35 - si * 0.07) * iF,
      }),
    );
    tetDown.rotation.x = Math.PI;
    tetDown.userData.tag = `tetDown-${si}`;
    tetDown.userData.scaleIdx = si;
    group.add(tetDown);
  });

  // Orbiting particles around the central form
  const N_ORBITERS = 60 + Math.round(cfg.complexity * 4);
  const orbPos = new Float32Array(N_ORBITERS * 3);
  for (let i = 0; i < N_ORBITERS; i++) {
    const theta = (i / N_ORBITERS) * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = R * (0.55 + Math.random() * 0.35);
    orbPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    orbPos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
    orbPos[i * 3 + 2] = Math.cos(phi) * r * 0.62;
  }
  const orbGeo = new THREE.BufferGeometry();
  const orbAttr = new THREE.BufferAttribute(orbPos, 3);
  orbAttr.setUsage(THREE.DynamicDrawUsage);
  orbGeo.setAttribute('position', orbAttr);
  const orbPts = new THREE.Points(
    orbGeo,
    circlePtsMat(hdrColor([rr, gg, bb], 0.55 * iF, 1.5), 2.5, 0.55 * iF),
  );
  orbPts.userData.tag = 'orbiters';
  group.add(orbPts);

  return group;
}

function updatePyramid3D(group: THREE.Group, cfg: Cfg, t: number, _R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const spd = cfg.breathSpeed;
  const tSec = t * 0.001;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    const si = (child.userData.scaleIdx as number) ?? 0;

    if (tag?.startsWith('tetUp')) {
      const baseSpd = 0.18 * spd * (si === 0 ? 1 : si === 1 ? 0.618 : 0.382);
      child.rotation.y = tSec * baseSpd;
      child.rotation.z = tSec * baseSpd * 0.38;
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.color.setRGB(rr / 255, gg / 255, bb / 255);
      mat.opacity = (0.55 - si * 0.1) * iF * (0.75 + 0.25 * Math.sin(tSec * 1.2 + si));
    } else if (tag?.startsWith('tetDown')) {
      const baseSpd = 0.14 * spd * (si === 0 ? 1 : si === 1 ? 0.618 : 0.382);
      child.rotation.x = Math.PI + tSec * baseSpd * 0.77;
      child.rotation.y = -tSec * baseSpd;
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.color.setRGB(rr / 255, gg / 255, bb / 255);
      mat.opacity = (0.35 - si * 0.07) * iF * (0.75 + 0.25 * Math.sin(tSec * 0.9 + si + 1));
    } else if (tag === 'orbiters') {
      const pts = child as THREE.Points;
      pts.rotation.y = tSec * 0.08 * spd;
      pts.rotation.z = tSec * 0.05 * spd;
      const mat = pts.material as THREE.PointsMaterial;
      mat.color.setRGB(rr / 255, gg / 255, bb / 255);
      mat.opacity = 0.55 * iF * (0.8 + 0.2 * Math.sin(tSec * 1.8));
    }
  }
}

/* ── Sinusoidal 3D Morph — organic looping transforms ───────── */

function buildSinMorph3D(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const N = 80 + Math.round(cfg.complexity * 3);
  const positions = new Float32Array(N * N * 3);
  let idx = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const u = (i / (N - 1)) * Math.PI * 2;
      const v = (j / (N - 1)) * Math.PI;
      positions[idx++] = R * 0.8 * Math.sin(v) * Math.cos(u);
      positions[idx++] = R * 0.8 * Math.sin(v) * Math.sin(u);
      positions[idx++] = R * 0.8 * Math.cos(v);
    }
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  const pts = new THREE.Points(
    geo,
    circlePtsMat(hdrColor([rr, gg, bb], 0.7 * iF, 1.5), 2.8, 0.7 * iF),
  );
  pts.userData.tag = 'sinMorphPts';
  pts.userData.N = N;
  group.add(pts);
  return group;
}

function updateSinMorph3D(group: THREE.Group, cfg: Cfg, t: number, R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const spd = cfg.breathSpeed;
  const cplx = cfg.complexity / 10;
  const tSec = t * 0.001 * spd;
  _musicPulse *= 0.95;
  _musicBass *= 0.972;
  _musicDrums *= 0.91;
  _musicPads *= 0.986;
  _musicKeys *= 0.978;
  _musicLead *= 0.925;
  const beatPhase = (t / 1000) * Math.PI * 2 * (_musicBpm / 60);
  const internalPulse = ((Math.sin(beatPhase) + 1) / 2) ** 3 * 0.22;
  const impact = Math.min(1, internalPulse + _musicDrums * 0.56 + _musicPulse * 0.34);
  const pressure = Math.min(1, _musicBass * 0.78 + internalPulse * 0.24);
  const atmosphere = Math.min(1, _musicPads * 0.55 + _musicKeys * 0.34 + internalPulse * 0.12);
  const spark = Math.min(1, _musicLead * 0.72 + _musicDrums * 0.22);

  for (const child of group.children) {
    if ((child.userData.tag as string) !== 'sinMorphPts') continue;
    const pts = child as THREE.Points;
    const N = child.userData.N as number;
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    // Morph cycle: four shape states over time
    const cycle = (tSec * 0.08) % 1;
    // a1..a4 are blend amplitudes for four sine displacement waves
    const a1 = (0.25 + impact * 0.08) * cplx * Math.sin(tSec * 0.7 + impact);
    const a2 = (0.18 + pressure * 0.08) * cplx * Math.sin(tSec * 0.43 + 1.2);
    const a3 = (0.14 + atmosphere * 0.08) * cplx * Math.sin(tSec * 0.31 + 2.5);
    const a4 = (0.1 + spark * 0.09) * cplx * Math.sin(tSec * 0.19 + 0.8);
    const breathe = 0.85 + 0.15 * Math.sin(beatPhase) + pressure * 0.08 + atmosphere * 0.04;

    let idx = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const u = (i / (N - 1)) * Math.PI * 2;
        const v = (j / (N - 1)) * Math.PI;
        const su = Math.sin(u),
          cu = Math.cos(u);
        const sv = Math.sin(v),
          cv = Math.cos(v);

        // Base sphere
        const x = sv * cu;
        const y = sv * su;
        const z = cv;

        // Wave displacement 1: sinusoidal twist
        const d1 = 1 + a1 * Math.sin(3 * u + tSec * 1.1) * Math.sin(2 * v + tSec * 0.7);
        // Wave displacement 2: pulsing lobes
        const d2 = 1 + a2 * Math.sin(5 * u - tSec * 0.9) * Math.cos(3 * v);
        // Wave displacement 3: toroidal ripple
        const d3 = 1 + a3 * Math.cos(4 * u + tSec * 0.5) * Math.sin(v * 4 - tSec * 0.6);
        // Wave displacement 4: spiky outbursts
        const d4 = 1 + a4 * Math.sin(7 * u + v * 2 + tSec * 1.7);

        const beatRipple = 1 + Math.sin(beatPhase - v * 2 + u * 0.5) * impact * 0.035;
        const r = R * 0.78 * d1 * d2 * d3 * d4 * breathe * beatRipple;
        arr[idx++] = x * r;
        arr[idx++] = y * r;
        arr[idx++] =
          z *
          r *
          (0.7 + 0.3 * Math.abs(Math.sin(tSec * 0.4 + cycle * Math.PI * 2)) + atmosphere * 0.08);
      }
    }
    posAttr.needsUpdate = true;
    pts.geometry.computeBoundingSphere();
    pts.rotation.y = tSec * 0.06 + pressure * 0.08;
    pts.rotation.z = tSec * 0.04 + impact * 0.05;

    const mat = pts.material as THREE.PointsMaterial;
    mat.color.setRGB(
      (lerp(rr, 255, spark * 0.18) / 255) * (1 + impact * 0.18),
      (lerp(gg, 230, spark * 0.12) / 255) * (1 + atmosphere * 0.12),
      (lerp(bb, 210, spark * 0.08) / 255) * (1 + atmosphere * 0.1),
    );
    mat.opacity = 0.64 * iF * (0.85 + 0.15 * Math.sin(tSec * 2.1)) + atmosphere * 0.14;
    mat.size = 2.8 + cfg.glow * 0.18 + impact * 0.85 + spark * 0.65;
  }
}

/* ── Clock Orbit 3D — armillary sphere / 3D clock rings ─────── */

const _CORB_RINGS = [
  { r: 0.15, rotX: 0, rotZ: 0, spd: 6.5, pSz: 7.0, phase: 0 },
  { r: 0.26, rotX: Math.PI / 2, rotZ: 0, spd: 4.0, pSz: 6.0, phase: 0.5 },
  { r: 0.38, rotX: Math.PI / 3, rotZ: Math.PI / 5, spd: 2.6, pSz: 5.2, phase: 1.1 },
  { r: 0.5, rotX: Math.PI * 0.65, rotZ: Math.PI / 4, spd: 1.7, pSz: 4.5, phase: 1.8 },
  { r: 0.62, rotX: Math.PI * 0.8, rotZ: Math.PI * 0.4, spd: 1.1, pSz: 3.8, phase: 2.5 },
  { r: 0.74, rotX: Math.PI / 5, rotZ: Math.PI * 0.65, spd: 0.6, pSz: 3.0, phase: 3.2 },
  { r: 0.87, rotX: Math.PI * 0.9, rotZ: Math.PI * 0.7, spd: 0.33, pSz: 2.4, phase: 4.0 },
] as const;

function buildClockOrbit3D(cfg: Cfg, R: number): THREE.Group {
  const group = new THREE.Group();
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;

  _CORB_RINGS.forEach((rc, ri) => {
    const r = R * rc.r;

    // Ring LineLoop — flat circle in XY plane, then tilted
    const RING_PTS = 128;
    const ringPos = new Float32Array(RING_PTS * 3);
    for (let i = 0; i < RING_PTS; i++) {
      const a = (i / RING_PTS) * Math.PI * 2;
      ringPos[i * 3] = r * Math.cos(a);
      ringPos[i * 3 + 1] = r * Math.sin(a);
      ringPos[i * 3 + 2] = 0;
    }
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
    const ring = new THREE.LineLoop(ringGeo, lineMat(hdrColor([rr, gg, bb], 0.28 * iF, 1.4), 0.35));
    ring.rotation.x = rc.rotX;
    ring.rotation.z = rc.rotZ;
    ring.userData.tag = `ring-${ri}`;
    ring.userData.ri = ri;
    group.add(ring);

    // 12 hour-mark dots on the ring
    const hourPos = new Float32Array(12 * 3);
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      hourPos[h * 3] = r * Math.cos(a);
      hourPos[h * 3 + 1] = r * Math.sin(a);
      hourPos[h * 3 + 2] = 0;
    }
    const hourGeo = new THREE.BufferGeometry();
    hourGeo.setAttribute('position', new THREE.BufferAttribute(hourPos, 3));
    const hourPts = new THREE.Points(
      hourGeo,
      ptsMat(hdrColor([rr, gg, bb], 0.55 * iF, 1.8), 2.0, 0.55 * iF),
    );
    hourPts.rotation.x = rc.rotX;
    hourPts.rotation.z = rc.rotZ;
    hourPts.userData.tag = `hours-${ri}`;
    group.add(hourPts);

    // Planet — 1 dynamic bright point
    const planetGeo = new THREE.BufferGeometry();
    const planetAttr = new THREE.BufferAttribute(new Float32Array(3), 3);
    planetAttr.setUsage(THREE.DynamicDrawUsage);
    planetGeo.setAttribute('position', planetAttr);
    const planet = new THREE.Points(
      planetGeo,
      circlePtsMat(hdrColor([rr, gg, bb], iF, 2.5), rc.pSz, 0.92 * iF),
    );
    planet.userData.tag = `planet-${ri}`;
    planet.userData.ri = ri;
    planet.userData.r = r;
    planet.userData.rotX = rc.rotX;
    planet.userData.rotZ = rc.rotZ;
    planet.userData.spd = rc.spd;
    planet.userData.phase = rc.phase;
    planet.userData.pSz = rc.pSz;
    group.add(planet);

    // Comet trail — 18 fading points
    const N_TRAIL = 18;
    const trailGeo = new THREE.BufferGeometry();
    const trailAttr = new THREE.BufferAttribute(new Float32Array(N_TRAIL * 3), 3);
    trailAttr.setUsage(THREE.DynamicDrawUsage);
    trailGeo.setAttribute('position', trailAttr);
    const trail = new THREE.Points(
      trailGeo,
      circlePtsMat(hdrColor([rr, gg, bb], 0.55 * iF, 1.8), rc.pSz * 0.55, 0.45 * iF),
    );
    trail.userData.tag = `trail-${ri}`;
    trail.userData.ri = ri;
    trail.userData.r = r;
    trail.userData.rotX = rc.rotX;
    trail.userData.rotZ = rc.rotZ;
    trail.userData.spd = rc.spd;
    trail.userData.phase = rc.phase;
    group.add(trail);
  });

  // Central nucleus
  const nucGeo = new THREE.SphereGeometry(R * 0.038, 12, 12);
  const nucMat = new THREE.MeshBasicMaterial({
    color: hdrColor([rr, gg, bb], 1.8 * iF, 2.2),
    transparent: true,
    opacity: 0.9,
  });
  const nuc = new THREE.Mesh(nucGeo, nucMat);
  nuc.userData.tag = 'nucleus';
  group.add(nuc);

  return group;
}

function updateClockOrbit3D(group: THREE.Group, cfg: Cfg, t: number, _R: number): void {
  const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
  const [rr, gg, bb] = pal.rgb;
  const iF = cfg.intensity / 10;
  const spd = cfg.breathSpeed;
  const tSec = t * 0.001;

  for (const child of group.children) {
    const tag = child.userData.tag as string;
    if (!tag) continue;

    if (tag === 'nucleus') {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.color.copy(hdrColor([rr, gg, bb], 1.8 * iF * (0.8 + 0.2 * Math.sin(tSec * 2.3)), 2.2));
    } else if (tag.startsWith('ring-')) {
      const ri = child.userData.ri as number;
      const mat = (child as THREE.LineLoop).material as THREE.LineBasicMaterial;
      mat.color.copy(hdrColor([rr, gg, bb], 0.28 * iF, 1.4));
      mat.opacity = 0.35 * iF * (0.75 + 0.25 * Math.sin(tSec * 0.7 + ri * 0.6));
    } else if (tag.startsWith('hours-')) {
      const mat = (child as THREE.Points).material as THREE.PointsMaterial;
      mat.color.copy(hdrColor([rr, gg, bb], 0.55 * iF, 1.8));
    } else if (tag.startsWith('planet-')) {
      const ri = child.userData.ri as number;
      const r = child.userData.r as number;
      const rotX = child.userData.rotX as number;
      const rotZ = child.userData.rotZ as number;
      const ringSpd = child.userData.spd as number;
      const phase = child.userData.phase as number;
      const pSz = child.userData.pSz as number;

      const angle = tSec * ringSpd * spd * 0.22 + phase;
      const euler = new THREE.Euler(rotX, 0, rotZ, 'XYZ');
      const pos = new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), 0);
      pos.applyEuler(euler);

      const attr = (child as THREE.Points).geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      arr[0] = pos.x;
      arr[1] = pos.y;
      arr[2] = pos.z;
      attr.needsUpdate = true;

      const mat = (child as THREE.Points).material as THREE.PointsMaterial;
      mat.color.copy(hdrColor([rr, gg, bb], iF, 2.5));
      mat.size = pSz * (0.85 + 0.15 * Math.sin(tSec * 2.1 + ri * 1.3)) + cfg.glow * 0.15;
      mat.opacity = 0.92 * iF * (0.85 + 0.15 * Math.sin(tSec * 1.5 + ri));
    } else if (tag.startsWith('trail-')) {
      const _ri = child.userData.ri as number;
      const r = child.userData.r as number;
      const rotX = child.userData.rotX as number;
      const rotZ = child.userData.rotZ as number;
      const ringSpd = child.userData.spd as number;
      const phase = child.userData.phase as number;

      const attr = (child as THREE.Points).geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const nTrail = arr.length / 3;
      const euler = new THREE.Euler(rotX, 0, rotZ, 'XYZ');

      for (let ti = 0; ti < nTrail; ti++) {
        const trailAngle = tSec * ringSpd * spd * 0.22 + phase - (ti / nTrail) * 0.55;
        const tp = new THREE.Vector3(r * Math.cos(trailAngle), r * Math.sin(trailAngle), 0);
        tp.applyEuler(euler);
        arr[ti * 3] = tp.x;
        arr[ti * 3 + 1] = tp.y;
        arr[ti * 3 + 2] = tp.z;
      }
      attr.needsUpdate = true;
    }
  }
}

/* ── Component ──────────────────────────────────────────────── */

export default function GeometryField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const matrixAnimRef = useRef<number>(0);
  const dprRef = useRef<number>(1);
  const cfgRef = useRef<Cfg>(PRESETS['Calm Field']);
  const journeyCfgRef = useRef<Cfg | null>(null);
  const dotsRef = useRef<Dot[]>(makeDots(160));
  const ripplesRef = useRef<Ripple[]>([]);

  // Journey refs (read by tick without re-render)
  const journeyRunningRef = useRef(false);
  const journeyIdRef = useRef(1);
  const journeyStartRef = useRef(0);
  const matrixActiveRef = useRef(false);
  const matrixDropsRef = useRef<number[]>([]);
  const matrixNumActiveRef = useRef(false);
  const matrixNumAnimRef = useRef<number>(0);
  const canvasModeActiveRef = useRef(false);
  const canvasModeAnimRef = useRef<number>(0);
  const phaseInfoRef = useRef({ phaseIdx: 0, phaseProgress: 0 });

  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const modeGroupRef = useRef<THREE.Group | null>(null);
  const builtKeyRef = useRef('');
  const starsGroupRef = useRef<THREE.Group | null>(null);
  const builtStarsKeyRef = useRef('');
  const sizeRef = useRef({ W: 0, H: 0 });
  const clearColorRef = useRef(new THREE.Color());
  const rippleRingsRef = useRef<THREE.Line[]>([]);
  const l3dRotRef = useRef({ x: 0.4, y: 0.0 });
  const l3dDragRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const fingerDistortRef = useRef(false);
  // Finger touch is a click-toggle: one click latches it on (and it follows the
  // pointer), another click turns it off — simpler than press-and-hold.
  const fingerLatchedRef = useRef(false);
  const motionModeRef = useRef<MotionMode>('animate');
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceAudioContextRef = useRef<AudioContext | null>(null);
  const voiceAnimRef = useRef<number>(0);
  const djStreamRef = useRef<MediaStream | null>(null);
  const djAudioContextRef = useRef<AudioContext | null>(null);
  const djAnimRef = useRef<number>(0);
  const liveSourceIdRef = useRef(`geometry-${Math.random().toString(36).slice(2)}`);
  const liveLastSeenRef = useRef(0);
  const livePublishTimerRef = useRef<number>(0);
  const projectionExitTimerRef = useRef<number>(0);

  const [cfg, setCfg] = useState<Cfg>(PRESETS['Calm Field']);
  const [selectedPresetName, setSelectedPresetName] = useState('Calm Field');
  const [word, setWord] = useState('HOPE');
  const wordRef = useRef('HOPE');
  const [fingerMode, setFingerMode] = useState<FingerMode>('off');
  const [rippleRingsVisible, setRippleRingsVisible] = useState(false);
  const [motionMode, setMotionMode] = useState<MotionMode>('animate');
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [djListening, setDjListening] = useState(false);
  const [djError, setDjError] = useState('');
  const [djEnergy, setDjEnergy] = useState({ level: 0, bass: 0, highs: 0 });
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'builder' | 'music' | 'journey'>('builder');
  const [builderView, setBuilderView] = useState<'programs' | 'sliders'>('sliders');
  const [liveMode, setLiveMode] = useState<LiveMode>('studio');
  const [liveStatus, setLiveStatus] = useState('local');
  const [currentScaleResponse, setCurrentScaleResponse] = useState({
    pulse: 0.72,
    movement: 0.62,
    flow: 0.68,
    colour: 0.28,
    geometry: 0.58,
    wings: 0.46,
  });
  const [currentScaleShape, setCurrentScaleShape] = useState('scales');
  const [galaxyResponse, setGalaxyResponse] = useState({
    impact: 0.64,
    gravity: 0.7,
    arms: 0.72,
    haze: 0.58,
    sparks: 0.52,
    depth: 0.42,
  });
  const [galaxyShape, setGalaxyShape] = useState('galaxy');
  const [journeyId, setJourneyId] = useState(1);
  const [journeyRunning, setJourneyRunning] = useState(false);
  const [journeyPhaseInfo, setJourneyPhaseInfo] = useState({ phaseIdx: 0, phaseProgress: 0 });

  useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  useEffect(() => {
    wordRef.current = word;
  }, [word]);

  useEffect(() => {
    motionModeRef.current = motionMode;
  }, [motionMode]);

  useLayoutEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // Projection mode removed — closing the controls gives a clean full-screen
      // display instead. Only studio / control remain.
      const mode: LiveMode = params.get('control') === '1' ? 'control' : 'studio';
      setLiveMode(mode);
      if (mode === 'control') setOpen(true);

      const urlPreset = params.get('preset');
      const requestedPreset =
        urlPreset ?? window.sessionStorage.getItem('colourmap:geometry-preset');
      if (requestedPreset) {
        window.sessionStorage.setItem('colourmap:geometry-preset', requestedPreset);
        const presetCfg = PRESETS[requestedPreset];
        if (presetCfg) {
          setSelectedPresetName(requestedPreset);
          setCfg({ ...presetCfg });
        }
        setTab('builder');
        setBuilderView('programs');
        if (urlPreset) {
          params.delete('preset');
          const query = params.toString();
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${query ? `?${query}` : ''}`,
          );
        }
        window.setTimeout(() => {
          window.sessionStorage.removeItem('colourmap:geometry-preset');
        }, 250);
      }
    } catch (error) {
      console.error('Geometry preset handoff failed', error);
    }
  }, []);

  useEffect(() => {
    if (liveMode !== 'control') return;
    window.clearTimeout(livePublishTimerRef.current);
    livePublishTimerRef.current = window.setTimeout(() => {
      fetch('/api/geometry-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetName: selectedPresetName,
          cfg,
          sourceId: liveSourceIdRef.current,
        }),
      })
        .then(() => setLiveStatus('sending'))
        .catch(() => setLiveStatus('offline'));
    }, 120);

    return () => window.clearTimeout(livePublishTimerRef.current);
  }, [cfg, liveMode, selectedPresetName]);

  useEffect(() => {
    if (liveMode !== 'projection') return;
    let stopped = false;

    async function pullLiveState() {
      try {
        const response = await fetch('/api/geometry-live', { cache: 'no-store' });
        if (!response.ok) throw new Error('Live state unavailable');
        const payload = (await response.json()) as GeometryLivePayload;
        if (stopped || !payload.updatedAt || payload.updatedAt <= liveLastSeenRef.current) return;
        liveLastSeenRef.current = payload.updatedAt;
        if (payload.presetName) setSelectedPresetName(payload.presetName);
        if (payload.cfg) {
          setCfg((prev) => ({
            ...prev,
            ...payload.cfg,
          }));
        }
        setLiveStatus('receiving');
      } catch {
        if (!stopped) setLiveStatus('offline');
      }
    }

    void pullLiveState();
    const id = window.setInterval(pullLiveState, 300);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [liveMode]);

  useEffect(() => {
    if (liveMode !== 'projection') return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      window.location.assign('/geometry-field');
    }
    function onPointerDown(event: PointerEvent) {
      if (event.clientX > 80 || event.clientY > 80) return;
      projectionExitTimerRef.current = window.setTimeout(() => {
        window.location.assign('/geometry-field');
      }, 900);
    }
    function onClick(event: MouseEvent) {
      if (event.clientX > 80 || event.clientY > 80) return;
      window.location.assign('/geometry-field');
    }
    function clearProjectionExit() {
      window.clearTimeout(projectionExitTimerRef.current);
    }
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('click', onClick);
    document.addEventListener('pointerup', clearProjectionExit);
    document.addEventListener('pointercancel', clearProjectionExit);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerup', clearProjectionExit);
      document.removeEventListener('pointercancel', clearProjectionExit);
      clearProjectionExit();
    };
  }, [liveMode]);

  useEffect(() => {
    _rippleRingsVisible = rippleRingsVisible;
    if (!rippleRingsVisible) ripplesRef.current.length = 0;
  }, [rippleRingsVisible]);

  useEffect(() => {
    _currentScalePulse = currentScaleResponse.pulse;
    _currentScaleBass = currentScaleResponse.movement;
    _currentScaleFlow = currentScaleResponse.flow;
    _currentScaleColour = currentScaleResponse.colour;
    _currentScaleGeometry = currentScaleResponse.geometry;
    _currentScaleWings = currentScaleResponse.wings;
    _currentScaleShape = currentScaleShape;
  }, [currentScaleResponse, currentScaleShape]);

  useEffect(() => {
    _galaxyImpact = galaxyResponse.impact;
    _galaxyGravity = galaxyResponse.gravity;
    _galaxyArms = galaxyResponse.arms;
    _galaxyHaze = galaxyResponse.haze;
    _galaxySparks = galaxyResponse.sparks;
    _galaxyDepth = galaxyResponse.depth;
    _galaxyShape = galaxyShape;
  }, [galaxyResponse, galaxyShape]);

  useEffect(() => {
    try {
      const savedBpm = Number(window.localStorage.getItem('colourmap:groove-bpm'));
      if (Number.isFinite(savedBpm) && savedBpm >= 40 && savedBpm <= 220) _musicBpm = savedBpm;
    } catch {}

    function onGrooveStep(event: Event) {
      const detail = (
        event as CustomEvent<{
          bpm?: number;
          energy?: Partial<Record<'drums' | 'bass' | 'keys' | 'lead' | 'pads', number>>;
        }>
      ).detail;
      const energy = detail?.energy ?? {};
      if (typeof detail?.bpm === 'number' && Number.isFinite(detail.bpm)) {
        _musicBpm = Math.max(40, Math.min(220, detail.bpm));
      }
      _musicDrums = Math.min(1, energy.drums ?? 0);
      _musicBass = Math.min(1, energy.bass ?? 0);
      _musicKeys = Math.min(1, energy.keys ?? 0);
      _musicLead = Math.min(1, energy.lead ?? 0);
      _musicPads = Math.min(1, (energy.pads ?? 0) + _musicKeys * 0.45);
      _musicPulse = Math.min(
        1,
        _musicDrums * 0.55 + _musicBass * 0.35 + _musicPads * 0.18 + _musicLead * 0.14,
      );
    }
    window.addEventListener('colourmap:groove-visual-step', onGrooveStep);
    return () => window.removeEventListener('colourmap:groove-visual-step', onGrooveStep);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(voiceAnimRef.current);
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
      void voiceAudioContextRef.current?.close();
      cancelAnimationFrame(djAnimRef.current);
      djStreamRef.current?.getTracks().forEach((track) => track.stop());
      void djAudioContextRef.current?.close();
      _voiceEnergy = 0;
      _musicPulse = 0;
      _musicBass = 0;
      _musicDrums = 0;
      _musicPads = 0;
      _musicKeys = 0;
      _musicLead = 0;
    };
  }, []);

  useEffect(() => {
    dotsRef.current = makeDots(Math.round(cfg.particles * 40 + 20));
  }, [cfg.particles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = canvasContainerRef.current;
    if (!canvas || !wrapper) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // Scene + Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(100, 100), 1.5, 0.5, 0.05);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    function resize() {
      const W = wrapper!.offsetWidth;
      const H = wrapper!.offsetHeight;
      sizeRef.current = { W, H };
      const dpr = Math.min(window.devicePixelRatio, 2);
      dprRef.current = dpr;
      renderer.setSize(W, H, false);
      camera.left = -W / 2;
      camera.right = W / 2;
      camera.top = H / 2;
      camera.bottom = -H / 2;
      camera.updateProjectionMatrix();
      composer.setSize(W, H);
      bloomPass.resolution.set(W, H);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);

    let phaseUpdateTimer = 0;

    function tick(rawT: number) {
      const t = motionModeRef.current === 'static' && !journeyRunningRef.current ? 0 : rawT;
      // Journey auto-pilot
      if (journeyRunningRef.current) {
        const jData = JOURNEYS[journeyIdRef.current - 1];
        if (jData) {
          const elapsed = (rawT - journeyStartRef.current) / 1000;
          const totalDur = jData.stages.reduce((s, st) => s + st.duration, 0);
          const loopTime = elapsed % totalDur;
          let acc = 0;
          for (let i = 0; i < jData.stages.length; i++) {
            const stage = jData.stages[i];
            if (loopTime < acc + stage.duration || i === jData.stages.length - 1) {
              const stageP = Math.min(1, (loopTime - acc) / stage.duration);
              const nextStage = jData.stages[(i + 1) % jData.stages.length];
              journeyCfgRef.current = journeyLerpCfg(stage, nextStage, stageP);
              // Update phase info every ~500ms to avoid excessive re-renders
              if (rawT - phaseUpdateTimer > 500) {
                phaseUpdateTimer = rawT;
                phaseInfoRef.current = { phaseIdx: i, phaseProgress: stageP };
              }
              break;
            }
            acc += stage.duration;
          }
        }
      } else {
        journeyCfgRef.current = null;
      }

      const currentCfg = journeyCfgRef.current ?? cfgRef.current;
      const { W, H } = sizeRef.current;
      const R = Math.min(W, H) * 0.42;

      // Update clear color from palette
      const pal = PAL[currentCfg.preset] ?? PAL['Calm Field'];
      clearColorRef.current.set(pal.bg1);
      renderer.setClearColor(clearColorRef.current, 1);

      // Bloom from luminous slider
      bloomPass.strength = currentCfg.luminous * 0.28;
      bloomPass.threshold = 0.05;
      bloomPass.radius = 0.4 + currentCfg.luminous * 0.04;

      // Rebuild stars when count or viewport changes
      const starsKey = `${Math.round(currentCfg.stars)}-${currentCfg.preset}-${currentCfg.mode}-${Math.round(W)}-${Math.round(H)}`;
      if (starsKey !== builtStarsKeyRef.current) {
        if (starsGroupRef.current) {
          scene.remove(starsGroupRef.current);
          disposeGroup(starsGroupRef.current);
        }
        starsGroupRef.current = buildStars(
          // Every preset shows a background starfield by default — floor the
          // count so even stars=0 presets keep a gentle field; the slider adds more.
          Math.max(3, currentCfg.stars),
          W,
          H,
          currentCfg.preset,
          currentCfg.mode,
        );
        scene.add(starsGroupRef.current);
        builtStarsKeyRef.current = starsKey;
      }
      if (starsGroupRef.current) updateStars(starsGroupRef.current, t);

      // Rebuild mode group when topology or palette changes
      const key = `${currentCfg.mode}-${currentCfg.preset}-${currentCfg.symmetry}-${Math.round(currentCfg.complexity)}`;
      if (key !== builtKeyRef.current || modeGroupRef.current === null) {
        if (modeGroupRef.current) {
          scene.remove(modeGroupRef.current);
          disposeGroup(modeGroupRef.current);
        }
        modeGroupRef.current = buildModeGroup(currentCfg, R);
        scene.add(modeGroupRef.current);
        builtKeyRef.current = key;
      }

      // Update mode each frame
      updateModeGroup(modeGroupRef.current!, currentCfg, dotsRef.current, t, R);

      // Apply 3D rotation for spinnable modes
      const is3D =
        currentCfg.mode === 'celtic' ||
        currentCfg.mode === 'lissajous3d' ||
        currentCfg.mode === 'tknot3d' ||
        currentCfg.mode === 'lorenz3d' ||
        currentCfg.mode === 'rose3d' ||
        currentCfg.mode === 'helix3d' ||
        currentCfg.mode === 'orbital3d' ||
        currentCfg.mode === 'firework3d' ||
        currentCfg.mode === 'fibonacci3d' ||
        currentCfg.mode === 'yantra3d' ||
        currentCfg.mode === 'rainbow3d' ||
        currentCfg.mode === 'emotion' ||
        currentCfg.mode === 'constellation' ||
        currentCfg.mode === 'drift' ||
        currentCfg.mode === 'cbloom' ||
        currentCfg.mode === 'orbit' ||
        currentCfg.mode === 'weave' ||
        currentCfg.mode === 'chaostri3d' ||
        currentCfg.mode === 'chaostrisphere' ||
        currentCfg.mode === 'treeoflife3d' ||
        currentCfg.mode === 'entropy3d' ||
        currentCfg.mode === 'embf3d' ||
        currentCfg.mode === 'pyramid3d' ||
        currentCfg.mode === 'sinmorph3d' ||
        currentCfg.mode === 'clockorbit3d';
      if (is3D && modeGroupRef.current) {
        if (!l3dDragRef.current && motionModeRef.current !== 'static') {
          // Slow auto-spin when not dragging
          l3dRotRef.current.y += 0.003;
        }
        modeGroupRef.current.rotation.x = l3dRotRef.current.x;
        modeGroupRef.current.rotation.y = l3dRotRef.current.y;
      }

      // Store W/H for ripple positioning
      scene.userData.W = W;
      scene.userData.H = H;

      // Handle optional visible ripple rings. Finger distortion remains active
      // even when these visual rings are hidden.
      if (_rippleRingsVisible && !isCurrentTextureMode(currentCfg.mode)) {
        updateRippleRings(scene, rippleRingsRef.current, ripplesRef.current, t, currentCfg, R);
      } else {
        ripplesRef.current.length = 0;
      }

      // Expire old ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        if (t - ripplesRef.current[i].born > 1800) ripplesRef.current.splice(i, 1);
      }

      composer.render();
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      for (const r of rippleRingsRef.current) {
        scene.remove(r);
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      }
      rippleRingsRef.current = [];
      if (modeGroupRef.current) disposeGroup(modeGroupRef.current);
      if (starsGroupRef.current) disposeGroup(starsGroupRef.current);
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  // Sync phase info to state for UI (throttled via interval)
  useEffect(() => {
    if (!journeyRunning) return;
    const id = setInterval(() => {
      setJourneyPhaseInfo({ ...phaseInfoRef.current });
    }, 800);
    return () => clearInterval(id);
  }, [journeyRunning]);

  // Matrix canvas code rain
  useEffect(() => {
    if (!journeyRunning || journeyId !== 5) {
      matrixActiveRef.current = false;
      cancelAnimationFrame(matrixAnimRef.current);
      const mc = matrixCanvasRef.current;
      if (mc) {
        const ctx = mc.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, mc.width, mc.height);
      }
      return;
    }
    const mc = matrixCanvasRef.current;
    if (!mc) return;
    const ctx = mc.getContext('2d');
    if (!ctx) return;
    mc.width = mc.offsetWidth || mc.clientWidth || 400;
    mc.height = mc.offsetHeight || mc.clientHeight || 600;
    const fontSize = 13;
    const cols = Math.floor(mc.width / fontSize);
    matrixDropsRef.current = Array(cols).fill(1);
    matrixActiveRef.current = true;
    const chars = '01アイウエオカキ∞∮∑∇◈⬡✦{}[]<>!@#$%'.split('');
    const mctx = ctx;
    const mmc = mc;
    function drawMatrix() {
      if (!matrixActiveRef.current) return;
      mctx.fillStyle = 'rgba(0,4,0,0.07)';
      mctx.fillRect(0, 0, mmc.width, mmc.height);
      mctx.font = `${fontSize}px monospace`;
      const drops = matrixDropsRef.current;
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const bright = Math.random() > 0.94 ? 220 : 65 + Math.floor(Math.random() * 60);
        mctx.fillStyle = `rgba(0,${bright},30,0.9)`;
        mctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > mmc.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      matrixAnimRef.current = requestAnimationFrame(drawMatrix);
    }
    matrixAnimRef.current = requestAnimationFrame(drawMatrix);
    return () => {
      matrixActiveRef.current = false;
      cancelAnimationFrame(matrixAnimRef.current);
    };
  }, [journeyRunning, journeyId]);

  // Standalone matrix-text mode — character rain + concentric number rings (7 rings, ~400+ chars)
  useEffect(() => {
    const isMatrix = cfg.mode === 'matrix' || cfg.mode === 'matrix3d';
    if (!isMatrix) {
      matrixNumActiveRef.current = false;
      cancelAnimationFrame(matrixNumAnimRef.current);
      const mc = matrixCanvasRef.current;
      if (mc && !matrixActiveRef.current) {
        const ctx2 = mc.getContext('2d');
        if (ctx2) ctx2.clearRect(0, 0, mc.width, mc.height);
      }
      return;
    }
    const mc = matrixCanvasRef.current;
    if (!mc) return;
    const ctx2 = mc.getContext('2d');
    if (!ctx2) return;

    const FS = 10;
    const resize = () => {
      mc.width = mc.offsetWidth || 400;
      mc.height = mc.offsetHeight || 600;
      matrixDropsRef.current = Array(Math.floor(mc.width / FS)).fill(1);
    };
    resize();
    matrixNumActiveRef.current = true;

    const pal = PAL[cfg.preset] ?? PAL['Matrix Green'];
    const [pr, pg, pb] = pal.rgb;

    // Rich character set — numbers, symbols, japanese, greek, math
    const ALL_CHARS =
      '0123456789012345678901234567890123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソΩ∞∑∮∇◈✦∫√π∆ψφλμσεδγβα∀∃∈⊂∪∩{}[]<>!?/=+−×÷ℕℤℝℂ¹²³⁴⁵⁶⁷⁸⁹⁰'.split(
        '',
      );
    // Rings use only digits + symbols for density
    const RING_CHARS = '0123456789∞∑∮∇Ω◈✦πψφλ∆αβγδεζηθικλμνξπρστυφχψω'.split('');

    // Ring config: 7 rings, 20→88 chars each  ≈ 364 total
    const RING_CFG = [
      { countBase: 20, fontSize: FS - 2, rotSpeed: 0.06, dir: 1, alphaBase: 0.72 },
      { countBase: 32, fontSize: FS - 1, rotSpeed: 0.05, dir: -1, alphaBase: 0.62 },
      { countBase: 44, fontSize: FS, rotSpeed: 0.04, dir: 1, alphaBase: 0.52 },
      { countBase: 56, fontSize: FS, rotSpeed: 0.035, dir: -1, alphaBase: 0.44 },
      { countBase: 68, fontSize: FS + 1, rotSpeed: 0.028, dir: 1, alphaBase: 0.36 },
      { countBase: 80, fontSize: FS + 1, rotSpeed: 0.022, dir: -1, alphaBase: 0.28 },
      { countBase: 92, fontSize: FS + 2, rotSpeed: 0.016, dir: 1, alphaBase: 0.2 },
    ];

    let frameCount = 0;

    function draw() {
      if (!matrixNumActiveRef.current) return;
      frameCount++;
      const W = mc!.width;
      const H = mc!.height;

      // Slow fade trail
      ctx2!.fillStyle = `rgba(0,0,0,0.045)`;
      ctx2!.fillRect(0, 0, W, H);

      ctx2!.font = `bold ${FS}px monospace`;
      const drops = matrixDropsRef.current;

      // Character rain — advance every 3rd frame for slower fall
      for (let i = 0; i < drops.length; i++) {
        const ch = ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
        const y = drops[i] * FS;
        if (y < H) {
          const isHead = drops[i] > 0 && Math.random() > 0.88;
          const bright = isHead ? 0.98 : 0.35 + Math.random() * 0.35;
          ctx2!.fillStyle = isHead
            ? `rgba(255,255,255,${bright})`
            : `rgba(${pr},${pg},${pb},${bright})`;
          ctx2!.fillText(ch, i * FS, y);
        }
        if (frameCount % 3 === 0) {
          if (y > H && Math.random() > 0.982) drops[i] = 0;
          else drops[i]++;
        }
      }

      // 7 concentric rings of numbers — slow, beautiful rotation
      const cx = W / 2;
      const cy = H / 2;
      const maxR = Math.min(W, H) * 0.47;
      const tSec = performance.now() * 0.001;

      ctx2!.textAlign = 'center';
      ctx2!.textBaseline = 'middle';

      RING_CFG.forEach((ring, ri) => {
        const r = maxR * ((ri + 1) / RING_CFG.length);
        const count = ring.countBase;
        const angle0 = tSec * ring.rotSpeed * ring.dir;
        ctx2!.font = `bold ${ring.fontSize}px monospace`;

        for (let n = 0; n < count; n++) {
          const angle = (n / count) * Math.PI * 2 + angle0;
          const x = cx + r * Math.cos(angle);
          const y2 = cy + r * Math.sin(angle);

          // Chars cycle based on time so they shimmer
          const charIdx = (n + Math.floor(tSec * (ri + 1) * 1.2)) % RING_CHARS.length;
          const ch = RING_CHARS[charIdx];

          // Alpha pulses subtly
          const pulse = 0.85 + 0.15 * Math.sin(tSec * 1.4 + n * 0.8 + ri);
          const alpha = ring.alphaBase * pulse;

          ctx2!.fillStyle = `rgba(${pr},${pg},${pb},${alpha})`;
          ctx2!.fillText(ch, x, y2);
        }

        // Subtle ring outline
        ctx2!.strokeStyle = `rgba(${pr},${pg},${pb},0.08)`;
        ctx2!.lineWidth = 0.4;
        ctx2!.beginPath();
        ctx2!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2!.stroke();
      });

      ctx2!.textAlign = 'start';
      ctx2!.textBaseline = 'alphabetic';
      matrixNumAnimRef.current = requestAnimationFrame(draw);
    }

    matrixNumAnimRef.current = requestAnimationFrame(draw);
    const ro = new ResizeObserver(resize);
    ro.observe(mc);
    return () => {
      matrixNumActiveRef.current = false;
      cancelAnimationFrame(matrixNumAnimRef.current);
      ro.disconnect();
      const ctx3 = mc.getContext('2d');
      if (ctx3) ctx3.clearRect(0, 0, mc.width, mc.height);
    };
  }, [cfg.mode, cfg.preset]);

  // Canvas overlay for Breath / Stream / Entropy / Word modes
  useEffect(() => {
    const isCanvasMode =
      cfg.mode === 'breath' ||
      cfg.mode === 'stream' ||
      cfg.mode === 'entropy' ||
      cfg.mode === 'wordneon' ||
      cfg.mode === 'hopefear' ||
      cfg.mode === 'wordecho' ||
      cfg.mode === 'wordparticle' ||
      cfg.mode === 'wordweave' ||
      cfg.mode === 'eclipse' ||
      cfg.mode === 'yinyang' ||
      cfg.mode === 'volcano' ||
      cfg.mode === 'atomicexplosion' ||
      cfg.mode === 'scriptures' ||
      cfg.mode === 'scripturesjp' ||
      cfg.mode === 'touchpreset' ||
      cfg.mode === 'metamorph' ||
      cfg.mode === 'chrysalis' ||
      cfg.mode === 'chrysalisrings' ||
      cfg.mode === 'breathform' ||
      cfg.mode === 'clock3d' ||
      cfg.mode === 'atomlight' ||
      cfg.mode === 'butterfly' ||
      cfg.mode === 'orbitdance' ||
      cfg.mode === 'ripplemorph' ||
      cfg.mode === 'kaleido3d' ||
      cfg.mode === 'mirrortunnel' ||
      cfg.mode === 'heartwave' ||
      cfg.mode === 'eyemorph' ||
      cfg.mode === 'heartdance' ||
      cfg.mode === 'infinitedive' ||
      cfg.mode === 'musicdots' ||
      cfg.mode === 'musicnebula' ||
      cfg.mode === 'musiclattice';
    if (!isCanvasMode) {
      canvasModeActiveRef.current = false;
      cancelAnimationFrame(canvasModeAnimRef.current);
      const mc = matrixCanvasRef.current;
      if (mc && !matrixActiveRef.current && !matrixNumActiveRef.current) {
        const c = mc.getContext('2d');
        if (c) c.clearRect(0, 0, mc.width, mc.height);
      }
      return;
    }
    const mc = matrixCanvasRef.current;
    if (!mc) return;
    const ctx = mc.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      mc.width = mc.offsetWidth || 400;
      mc.height = mc.offsetHeight || 600;
    };
    resize();
    canvasModeActiveRef.current = true;

    const pal = PAL[cfg.preset] ?? PAL['Calm Field'];
    const [pr, pg, pb] = pal.rgb;
    const speed = cfg.breathSpeed;
    const iF = cfg.intensity / 10;
    const modeSeconds = () => (motionModeRef.current === 'static' ? 0 : performance.now() * 0.001);

    // Initial opaque fill — covers Three.js layer from frame 0 so no Sacred geometry bleeds through.
    // Parse bg0 hex (#rrggbb) to RGB for a palette-accurate background.
    {
      const h = pal.bg0.replace('#', '');
      const bgR = parseInt(h.slice(0, 2), 16);
      const bgG = parseInt(h.slice(2, 4), 16);
      const bgB = parseInt(h.slice(4, 6), 16);
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx.fillRect(0, 0, mc.width, mc.height);
    }

    if (cfg.mode === 'musicdots' || cfg.mode === 'musicnebula' || cfg.mode === 'musiclattice') {
      const N = Math.max(260, Math.round(lerp(520, 1700, cfg.complexity / 10)));
      const dots = Array.from({ length: N }, (_, i) => ({
        a: ((i * 0.61803398875) % 1) * Math.PI * 2,
        r: Math.sqrt((i + 0.5) / N),
        spin: 0.35 + ((i * 19) % 100) / 100,
        lane: i % Math.max(3, Math.round(cfg.symmetry)),
      }));

      function drawMusicVisual() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const cx = W / 2;
        const cy = H / 2;
        const radius = Math.min(W, H) * 0.48;
        const tt = modeSeconds();
        _musicPulse *= 0.94;
        _musicBass *= 0.96;
        _musicDrums *= 0.9;
        _musicPads *= 0.985;
        const internalBeat = (Math.sin(tt * Math.PI * 2 * (_musicBpm / 60)) + 1) / 2;
        const beat = Math.min(1, internalBeat * 0.42 + _musicPulse * 0.85);
        const low = Math.min(
          1,
          ((Math.sin(tt * Math.PI * speed * 0.52 + 1.7) + 1) / 2) * 0.45 + _musicBass,
        );
        ctx!.fillStyle = `rgba(0,0,0,${cfg.mode === 'musicnebula' ? 0.13 : 0.2})`;
        ctx!.fillRect(0, 0, W, H);

        if (cfg.mode === 'musiclattice') {
          ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.05 + beat * 0.16})`;
          ctx!.lineWidth = 1;
          const cells = Math.max(5, Math.round(cfg.symmetry));
          for (let x = -cells; x <= cells; x++) {
            for (let y = -cells; y <= cells; y++) {
              const px = cx + (x / cells) * radius * 0.95 + Math.sin(tt + y) * beat * 8;
              const py = cy + (y / cells) * radius * 0.95 + Math.cos(tt + x) * beat * 8;
              ctx!.strokeRect(px - 9 - low * 5, py - 9 - low * 5, 18 + low * 10, 18 + low * 10);
            }
          }
        }

        for (let i = 0; i < dots.length; i++) {
          const d = dots[i];
          if (cfg.mode === 'musiclattice') {
            const grid = Math.max(3, Math.round(cfg.symmetry));
            const gx = (d.lane / grid - 0.5) * radius * 1.65;
            const gy = (((i / grid) % grid) / grid - 0.5) * radius * 1.65;
            const cyclone = Math.sin(tt * 1.4 + d.a * 4) * beat * 12;
            ctx!.fillStyle = `rgba(${pr},${pg},${pb},${0.22 + beat * 0.62})`;
            ctx!.beginPath();
            ctx!.arc(
              cx + gx + Math.cos(d.a) * cyclone,
              cy + gy + Math.sin(d.a) * cyclone,
              1.1 + beat * 1.8,
              0,
              Math.PI * 2,
            );
            ctx!.fill();
            continue;
          }
          let rr = d.r * radius * (0.36 + 0.74 * low);
          let a = d.a + tt * 0.18 * d.spin;
          if (cfg.mode === 'musicnebula') {
            a += d.r * 5.2 + Math.sin(tt * 0.6 + d.lane) * 0.18;
            rr *= 0.88 + Math.sin(d.r * 10 + tt) * 0.08;
          }
          ctx!.fillStyle = `rgba(${pr},${pg},${pb},${0.16 + beat * 0.58})`;
          ctx!.beginPath();
          ctx!.arc(
            cx + Math.cos(a) * rr,
            cy + Math.sin(a) * rr * (cfg.mode === 'musicnebula' ? 0.58 : 0.82),
            0.8 + beat * 2.2 * iF,
            0,
            Math.PI * 2,
          );
          ctx!.fill();
        }

        ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.16 + beat * 0.34 + _musicPads * 0.18})`;
        ctx!.lineWidth = 1 + beat * 2;
        for (let k = 0; k < 3; k++) {
          ctx!.beginPath();
          ctx!.arc(cx, cy, radius * (0.2 + k * 0.16 + beat * 0.04), 0, Math.PI * 2);
          ctx!.stroke();
        }
        canvasModeAnimRef.current = requestAnimationFrame(drawMusicVisual);
      }
      drawMusicVisual();
      return () => {
        canvasModeActiveRef.current = false;
        cancelAnimationFrame(canvasModeAnimRef.current);
      };
    }

    /* ── BREATH: dots travel radial spokes inward then burst outward ── */
    if (cfg.mode === 'breath') {
      const SPOKES = Math.max(4, Math.round(cfg.symmetry));
      const DOTS_PER_SPOKE = Math.max(4, Math.round(cfg.complexity * 0.9));
      const TRAIL = 0.04;

      function drawBreath() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const cx = W / 2;
        const cy = H / 2;
        const R = Math.min(W, H) * 0.44;

        // Fade trail
        ctx!.fillStyle = `rgba(0,0,0,${TRAIL})`;
        ctx!.fillRect(0, 0, W, H);

        const tSec = performance.now() * 0.001 * speed;

        for (let s = 0; s < SPOKES; s++) {
          const spokeAngle = (s / SPOKES) * Math.PI * 2;
          const dx = Math.cos(spokeAngle);
          const dy = Math.sin(spokeAngle);
          // Slight perpendicular curl for liquid feel
          const curlX = -dy * 0.18;
          const curlY = dx * 0.18;

          for (let d = 0; d < DOTS_PER_SPOKE; d++) {
            const phase = (tSec * 0.38 + d / DOTS_PER_SPOKE + (s / SPOKES) * 0.5) % 1.0;
            // 0→0.5: inward (outer→center), 0.5→1.0: outward (center→outer)
            const inward = phase < 0.5;
            const t01 = inward ? phase * 2 : (phase - 0.5) * 2;
            // Ease in/out
            const eased = t01 * t01 * (3 - 2 * t01);
            const dist = inward ? R * (1 - eased) : R * eased;
            const curl = Math.sin(t01 * Math.PI) * R * 0.22;

            const x = cx + dx * dist + curlX * curl;
            const y = cy + dy * dist + curlY * curl;
            const opacity = inward ? 0.3 + 0.65 * eased : 0.95 - 0.65 * eased;
            const size = inward ? 1.5 + 2.5 * eased : 4 - 2.5 * eased;

            ctx!.beginPath();
            ctx!.arc(x, y, size * iF, 0, Math.PI * 2);
            ctx!.fillStyle = `rgba(${pr},${pg},${pb},${Math.max(0, Math.min(1, opacity * iF))})`;
            ctx!.fill();
          }
        }
        // Soft center glow
        const grd = ctx!.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18);
        grd.addColorStop(0, `rgba(${pr},${pg},${pb},${0.22 * iF})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = grd;
        ctx!.fillRect(0, 0, W, H);

        canvasModeAnimRef.current = requestAnimationFrame(drawBreath);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawBreath);
    }

    /* ── STREAM: stable vector field flow — no pulse ─────────────── */
    if (cfg.mode === 'stream') {
      const N = Math.round(200 + cfg.complexity * 30);
      type Particle = { x: number; y: number; vx: number; vy: number; age: number; maxAge: number };
      const particles: Particle[] = [];
      const W0 = mc.width;
      const H0 = mc.height;
      for (let i = 0; i < N; i++) {
        particles.push({
          x: Math.random() * W0,
          y: Math.random() * H0,
          vx: 0,
          vy: 0,
          age: Math.random() * 120,
          maxAge: 80 + Math.random() * 120,
        });
      }
      const FREQ_X = 0.008 + cfg.complexity * 0.0004;
      const FREQ_Y = 0.007 + cfg.complexity * 0.0003;

      function drawStream() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;

        ctx!.fillStyle = 'rgba(0,0,0,0.032)';
        ctx!.fillRect(0, 0, W, H);

        const tSec = performance.now() * 0.001 * speed * 0.5;

        for (const p of particles) {
          // Sine vector field — smooth attractor paths
          const vx = Math.sin(p.y * FREQ_Y + tSec * 0.6) * 1.8;
          const vy = Math.cos(p.x * FREQ_X - tSec * 0.5) * 1.8;
          // Additional cross-field term for spiral tendency
          const cx2 = W / 2;
          const cy2 = H / 2;
          const rx = p.x - cx2;
          const ry = p.y - cy2;
          const cfield = 0.00012;
          p.vx = p.vx * 0.85 + (vx - ry * cfield) * 0.15;
          p.vy = p.vy * 0.85 + (vy + rx * cfield) * 0.15;

          const prevX = p.x;
          const prevY = p.y;
          p.x += p.vx;
          p.y += p.vy;
          p.age++;

          const lifeT = p.age / p.maxAge;
          const opacity = Math.sin(lifeT * Math.PI) * 0.65 * iF;

          ctx!.beginPath();
          ctx!.moveTo(prevX, prevY);
          ctx!.lineTo(p.x, p.y);
          ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${Math.max(0, opacity)})`;
          ctx!.lineWidth = 1.2;
          ctx!.stroke();

          if (p.age > p.maxAge || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
            p.x = Math.random() * W;
            p.y = Math.random() * H;
            p.vx = 0;
            p.vy = 0;
            p.age = 0;
            p.maxAge = 80 + Math.random() * 120;
          }
        }
        canvasModeAnimRef.current = requestAnimationFrame(drawStream);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawStream);
    }

    /* ── ENTROPY: scattered number/letter particles drifting ─────── */
    if (cfg.mode === 'entropy') {
      const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZΩπ∞∑∮√∆ψφλμσεδγβα∀∃∈'.split('');
      const N = Math.round(80 + cfg.complexity * 18);
      type EChar = {
        x: number;
        y: number;
        vx: number;
        vy: number;
        ch: string;
        size: number;
        opacity: number;
        age: number;
        maxAge: number;
        fadeDir: number;
      };
      const chars: EChar[] = [];
      const W0 = mc.width;
      const H0 = mc.height;
      for (let i = 0; i < N; i++) {
        chars.push({
          x: Math.random() * W0,
          y: Math.random() * H0,
          vx: (Math.random() - 0.5) * 0.5 * speed,
          vy: (Math.random() - 0.5) * 0.5 * speed,
          ch: CHARS[Math.floor(Math.random() * CHARS.length)],
          size: 8 + Math.random() * 14,
          opacity: 0,
          age: Math.floor(Math.random() * 200),
          maxAge: 120 + Math.random() * 200,
          fadeDir: 1,
        });
      }

      function drawEntropy() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;

        ctx!.fillStyle = 'rgba(0,0,0,0.025)';
        ctx!.fillRect(0, 0, W, H);

        for (const c of chars) {
          c.x += c.vx;
          c.y += c.vy;
          c.age++;

          // Fade in then out
          const lifeT = c.age / c.maxAge;
          c.opacity = Math.sin(lifeT * Math.PI) * 0.85 * iF;

          if (c.opacity > 0.02) {
            ctx!.font = `${Math.round(c.size)}px monospace`;
            ctx!.fillStyle = `rgba(${pr},${pg},${pb},${Math.max(0, Math.min(1, c.opacity))})`;
            ctx!.fillText(c.ch, c.x, c.y);
          }

          // Slowly drift character change
          if (Math.random() < 0.002) {
            c.ch = CHARS[Math.floor(Math.random() * CHARS.length)];
          }

          if (c.age > c.maxAge || c.x < -40 || c.x > W + 40 || c.y < -40 || c.y > H + 40) {
            c.x = Math.random() * W;
            c.y = Math.random() * H;
            c.vx = (Math.random() - 0.5) * 0.5 * speed;
            c.vy = (Math.random() - 0.5) * 0.5 * speed;
            c.ch = CHARS[Math.floor(Math.random() * CHARS.length)];
            c.size = 8 + Math.random() * 14;
            c.age = 0;
            c.maxAge = 120 + Math.random() * 200;
          }
        }
        canvasModeAnimRef.current = requestAnimationFrame(drawEntropy);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawEntropy);
    }

    /* ── SCRIPTURES: sacred sand fills written characters ───────────── */
    if (cfg.mode === 'eclipse') {
      const count = Math.max(1400, Math.round(2200 + cfg.intensity * 260));
      const dust = Array.from({ length: count }, (_, i) => ({
        a: (i / count) * Math.PI * 2 + Math.random() * 0.018,
        r: 0.34 + Math.random() ** 0.5 * 0.55,
        p: Math.random() * Math.PI * 2,
        s: 0.75 + Math.random() * 0.8,
      }));

      function drawEclipse() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const radius = Math.min(W, H) * 0.46;
        const cx = W / 2;
        const cy = H / 2;
        const tt = modeSeconds() * Math.max(0.2, speed);
        ctx!.shadowBlur = 0;
        ctx!.globalCompositeOperation = 'source-over';
        ctx!.fillStyle = 'rgba(7,3,0,0.74)';
        ctx!.fillRect(0, 0, W, H);

        const coreR = radius * (0.31 + cfg.glow * 0.006);
        for (const dot of dust) {
          const a = dot.a + tt * 0.035;
          const ripple = Math.sin(a * cfg.symmetry + tt * 0.7 + dot.p) * radius * 0.01;
          const rr = radius * dot.r + ripple;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr * 0.86;
          const alpha = (0.56 + Math.sin(tt * 1.2 + dot.p) * 0.08) * iF;
          ctx!.beginPath();
          ctx!.arc(x, y, dot.s, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${pr},${pg},${pb},${Math.max(0.18, alpha)})`;
          ctx!.fill();
        }

        ctx!.shadowBlur = 0;
        ctx!.globalCompositeOperation = 'source-over';
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, coreR, coreR * 0.86, 0, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgb(0,0,0)';
        ctx!.fill();

        canvasModeAnimRef.current = requestAnimationFrame(drawEclipse);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawEclipse);
    }

    if (cfg.mode === 'yinyang') {
      const count = Math.max(1800, Math.round(2400 + cfg.intensity * 260));
      const dots = Array.from({ length: count }, (_, i) => ({
        a: ((i * 0.61803398875) % 1) * Math.PI * 2,
        r: Math.sqrt((i + 0.5) / count) * (0.92 + Math.random() * 0.05),
        p: Math.random() * Math.PI * 2,
        s: 0.75 + Math.random() * 0.95,
      }));

      function drawYinYang() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const radius = Math.min(W, H) * 0.43;
        const cx = W / 2;
        const cy = H / 2;
        const tt = modeSeconds() * Math.max(0.18, speed);
        ctx!.shadowBlur = 0;
        ctx!.globalCompositeOperation = 'source-over';
        ctx!.fillStyle = 'rgba(4,3,1,0.62)';
        ctx!.fillRect(0, 0, W, H);

        for (const dot of dots) {
          const a = dot.a + tt * 0.22 + Math.sin(dot.r * 7 + tt + dot.p) * 0.045;
          const r = radius * dot.r;
          const lx = Math.cos(a) * r;
          const ly = Math.sin(a) * r;
          const divider = Math.sin((ly / radius) * Math.PI) * radius * 0.34;
          const whiteSide = lx > divider;
          const smallLight = Math.hypot(lx, ly - radius * 0.46) < radius * 0.11;
          const smallDark = Math.hypot(lx, ly + radius * 0.46) < radius * 0.11;
          const lightDot = smallLight || (whiteSide && !smallDark);
          const alpha = 0.34 + Math.sin(tt * 1.2 + dot.p) * 0.08 + iF * 0.35;
          ctx!.beginPath();
          ctx!.arc(cx + lx, cy + ly, dot.s, 0, Math.PI * 2);
          ctx!.fillStyle = lightDot
            ? `rgba(${pr},${pg},${pb},${Math.min(0.92, alpha)})`
            : `rgba(0,0,0,${Math.min(0.86, alpha + 0.08)})`;
          ctx!.fill();
        }

        canvasModeAnimRef.current = requestAnimationFrame(drawYinYang);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawYinYang);
    }

    if (cfg.mode === 'volcano' || cfg.mode === 'atomicexplosion') {
      const count = Math.max(1800, Math.round(2500 + cfg.intensity * 280));
      const dots = Array.from({ length: count }, (_, i) => ({
        u: (i + 0.5) / count,
        a: ((i * 0.61803398875) % 1) * Math.PI * 2,
        p: Math.random() * Math.PI * 2,
        s: 0.75 + Math.random() * 1,
      }));

      // Soft glowing dot sprite (drawn additively) so the canvas dots have the
      // same luminous quality as the Three.js point modes (e.g. Cyclone Tiles),
      // instead of flat 1px discs.
      const dotSprite = document.createElement('canvas');
      const DSR = 24;
      dotSprite.width = DSR * 2;
      dotSprite.height = DSR * 2;
      const dctx = dotSprite.getContext('2d');
      if (dctx) {
        const g = dctx.createRadialGradient(DSR, DSR, 0, DSR, DSR, DSR);
        g.addColorStop(0, `rgba(${pr},${pg},${pb},1)`);
        g.addColorStop(0.35, `rgba(${pr},${pg},${pb},0.5)`);
        g.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
        dctx.fillStyle = g;
        dctx.beginPath();
        dctx.arc(DSR, DSR, DSR, 0, Math.PI * 2);
        dctx.fill();
      }

      function drawExplosion() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const radius = Math.min(W, H) * 0.46;
        const cx = W / 2;
        const cy = H / 2;
        const tt = modeSeconds() * Math.max(0.18, speed);
        const loop = (tt * 0.16) % 1;
        ctx!.shadowBlur = 0;
        ctx!.globalCompositeOperation = 'source-over';
        ctx!.fillStyle = 'rgba(7,2,0,0.64)';
        ctx!.fillRect(0, 0, W, H);

        ctx!.globalCompositeOperation = 'lighter';
        for (const dot of dots) {
          let x = 0;
          let y = 0;
          let alpha = 0.45 + iF * 0.32;
          if (cfg.mode === 'volcano') {
            const side = dot.u < 0.5 ? -1 : 1;
            const q = (dot.u * 2) % 1;
            const plume = (q + loop) % 1;
            const width = radius * (0.14 + plume * 0.46);
            const baseY = radius * 0.46;
            const cone = q < 0.34;
            if (cone) {
              const h = q / 0.34;
              x = side * width * h + Math.sin(dot.p + tt) * radius * 0.012;
              y = baseY - h * radius * 0.42;
              alpha = 0.5 + iF * 0.25;
            } else {
              const h = (q - 0.34 + loop) % 1;
              const spread = radius * (0.08 + h * 0.58);
              const jet = Math.sin(dot.a * cfg.symmetry + tt * 1.2) * radius * 0.04;
              x = Math.cos(dot.a) * spread * 0.55 + jet;
              y = -radius * 0.08 - h * radius * 0.86 + Math.sin(dot.p + tt) * radius * 0.02;
              alpha = (1 - h * 0.55) * (0.45 + iF * 0.4);
            }
          } else {
            const q = (dot.u + loop) % 1;
            const ring = q ** 0.72;
            const cap = Math.sin(ring * Math.PI);
            const a = dot.a + Math.sin(dot.p + tt) * 0.05;
            const mushroom = ring > 0.45 ? Math.sin(a * cfg.symmetry) * radius * 0.035 : 0;
            x = Math.cos(a) * radius * (0.1 + ring * 0.82 + mushroom / radius);
            y =
              Math.sin(a) * radius * (0.1 + ring * 0.58) -
              cap * radius * 0.18 +
              (ring > 0.55 ? -radius * 0.16 : 0);
            alpha = (1 - q * 0.42) * (0.42 + iF * 0.44);
          }
          const sz = dot.s * (3.2 + cfg.luminous * 1.1);
          ctx!.globalAlpha = Math.max(0.12, alpha);
          ctx!.drawImage(dotSprite, cx + x - sz, cy + y - sz, sz * 2, sz * 2);
        }
        ctx!.globalAlpha = 1;

        canvasModeAnimRef.current = requestAnimationFrame(drawExplosion);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawExplosion);
    }

    if (cfg.mode === 'touchpreset') {
      type TouchDot = {
        x: number;
        y: number;
        vx: number;
        vy: number;
        age: number;
        life: number;
        size: number;
        spin: number;
      };
      const dots: TouchDot[] = [];
      let hasTouched = false;

      function emitTouchDots(W: number, H: number) {
        if (!_distortActive) return;
        hasTouched = true;
        const x = _distortWorldX + W / 2;
        const y = H / 2 - _distortWorldY;
        const emitCount = Math.round(lerp(16, 52, cfg.complexity / 10));
        for (let i = 0; i < emitCount; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() ** 0.55 * Math.min(W, H) * 0.028;
          const out = lerp(0.8, 3.2, cfg.glow / 10) * (0.55 + Math.random());
          dots.push({
            x: x + Math.cos(a) * r,
            y: y + Math.sin(a) * r,
            vx: Math.cos(a) * out + Math.cos(a + Math.PI / 2) * out * 0.62,
            vy: Math.sin(a) * out + Math.sin(a + Math.PI / 2) * out * 0.62,
            age: 0,
            life: 44 + Math.random() * 74,
            size: 0.75 + Math.random() * 1.8,
            spin: Math.random() > 0.5 ? 1 : -1,
          });
        }
        if (dots.length > 1600) dots.splice(0, dots.length - 1600);
      }

      const touchSprite = document.createElement('canvas');
      const TSR = 24;
      touchSprite.width = TSR * 2;
      touchSprite.height = TSR * 2;
      const tctx = touchSprite.getContext('2d');
      if (tctx) {
        const g = tctx.createRadialGradient(TSR, TSR, 0, TSR, TSR, TSR);
        g.addColorStop(0, `rgba(${pr},${pg},${pb},1)`);
        g.addColorStop(0.35, `rgba(${pr},${pg},${pb},0.5)`);
        g.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
        tctx.fillStyle = g;
        tctx.beginPath();
        tctx.arc(TSR, TSR, TSR, 0, Math.PI * 2);
        tctx.fill();
      }

      function drawTouchPreset() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const tt = modeSeconds() * Math.max(0.2, speed);
        ctx!.shadowBlur = 0;
        ctx!.globalCompositeOperation = 'source-over';
        ctx!.fillStyle = 'rgba(0,0,0,0.2)';
        ctx!.fillRect(0, 0, W, H);

        emitTouchDots(W, H);

        ctx!.globalCompositeOperation = 'lighter';
        for (let i = dots.length - 1; i >= 0; i--) {
          const dot = dots[i];
          const cx = _distortWorldX + W / 2;
          const cy = H / 2 - _distortWorldY;
          const dx = dot.x - cx;
          const dy = dot.y - cy;
          const d = Math.hypot(dx, dy) + 1;
          const swirl = (0.04 + cfg.glow * 0.006) * dot.spin;
          dot.vx += (-dy / d) * swirl + Math.sin(tt + dot.y * 0.01) * 0.018;
          dot.vy += (dx / d) * swirl + Math.cos(tt + dot.x * 0.01) * 0.018;
          dot.vx *= 0.986;
          dot.vy *= 0.986;
          dot.x += dot.vx;
          dot.y += dot.vy;
          dot.age += 1;
          const lifeT = dot.age / dot.life;
          const alpha = Math.sin(Math.min(1, lifeT) * Math.PI) * (0.34 + iF * 0.45);
          const sz = dot.size * (2.6 + cfg.luminous * 0.9);
          ctx!.globalAlpha = Math.max(0, alpha);
          ctx!.drawImage(touchSprite, dot.x - sz, dot.y - sz, sz * 2, sz * 2);
          if (
            dot.age >= dot.life ||
            dot.x < -40 ||
            dot.x > W + 40 ||
            dot.y < -40 ||
            dot.y > H + 40
          ) {
            dots.splice(i, 1);
          }
        }

        ctx!.globalAlpha = 1;
        ctx!.globalCompositeOperation = 'source-over';
        if (!hasTouched && dots.length === 0) {
          ctx!.fillStyle = `rgba(${pr},${pg},${pb},0.66)`;
          ctx!.font = `600 ${Math.max(14, Math.round(Math.min(W, H) * 0.036))}px serif`;
          ctx!.textAlign = 'center';
          ctx!.textBaseline = 'middle';
          ctx!.fillText('touch to begin', W / 2, H / 2);
          ctx!.textAlign = 'start';
          ctx!.textBaseline = 'alphabetic';
        }

        canvasModeAnimRef.current = requestAnimationFrame(drawTouchPreset);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawTouchPreset);
    }

    if (cfg.mode === 'scriptures' || cfg.mode === 'scripturesjp') {
      const vertical = cfg.mode === 'scripturesjp';
      const text = vertical ? ['空', '海', '心', '光'] : ['ॐ मणि पद्मे हूँ'];
      const off = document.createElement('canvas');
      off.width = mc.width;
      off.height = mc.height;
      const offCtx = off.getContext('2d')!;
      type SandDot = {
        x: number;
        y: number;
        tx: number;
        ty: number;
        phase: number;
        size: number;
        delay: number;
      };
      const dots: SandDot[] = [];

      function rebuildScriptureDots() {
        const W = mc!.width;
        const H = mc!.height;
        off.width = W;
        off.height = H;
        offCtx.clearRect(0, 0, W, H);
        offCtx.fillStyle = '#fff';
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        if (vertical) {
          const fontSize = Math.min(W * 0.2, H * 0.14, 88);
          offCtx.font = `900 ${Math.round(fontSize)}px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", serif`;
          const totalH = fontSize * (text.length - 1) * 1.12;
          text.forEach((char, i) => {
            offCtx.fillText(char, W / 2, H / 2 - totalH / 2 + i * fontSize * 1.12);
          });
        } else {
          const fontSize = Math.min(W * 0.095, H * 0.18, 74);
          offCtx.font = `900 ${Math.round(fontSize)}px "Noto Serif Devanagari", "Nirmala UI", "Mangal", serif`;
          offCtx.fillText(text[0], W / 2, H / 2);
        }

        const img = offCtx.getImageData(0, 0, W, H).data;
        dots.length = 0;
        const stride = Math.max(3, Math.round(10 - cfg.complexity * 0.58));
        const cx = W / 2;
        const cy = H / 2;
        for (let y = 0; y < H; y += stride) {
          for (let x = 0; x < W; x += stride) {
            const idx = (y * W + x) * 4;
            if (img[idx + 3] <= 80) continue;
            const angle = Math.atan2(y - cy, x - cx);
            const fromR = Math.max(W, H) * (0.46 + Math.random() * 0.22);
            dots.push({
              x: cx + Math.cos(angle) * fromR + (Math.random() - 0.5) * W * 0.16,
              y: cy + Math.sin(angle) * fromR + (Math.random() - 0.5) * H * 0.16,
              tx: x,
              ty: y,
              phase: Math.random() * Math.PI * 2,
              size: 0.8 + Math.random() * 1.5,
              delay: Math.random() * 0.55,
            });
          }
        }
      }

      rebuildScriptureDots();
      const scriptureStart = performance.now();

      function drawScriptures() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        if (off.width !== W || off.height !== H) rebuildScriptureDots();

        const tt =
          motionModeRef.current === 'static'
            ? 0
            : (performance.now() - scriptureStart) * 0.001 * speed;
        const cx = W / 2;
        const cy = H / 2;
        ctx!.fillStyle = 'rgba(0,0,0,0.2)';
        ctx!.fillRect(0, 0, W, H);

        const cycle = (tt * 0.075) % 1;
        const destroy = Math.max(0, Math.min(1, (cycle - 0.2) / 0.48));
        const rewrite = Math.max(0, Math.min(1, (cycle - 0.72) / 0.28));
        const written = cycle < 0.2 ? 1 : cycle < 0.72 ? 1 - destroy : rewrite;
        const sweep = vertical
          ? (dot: SandDot) => Math.max(0, Math.min(1, (dot.ty / H - 0.08) / 0.84))
          : (dot: SandDot) => Math.max(0, Math.min(1, (dot.tx / W - 0.08) / 0.84));

        for (const dot of dots) {
          const lineDelay = sweep(dot) * 0.16 + dot.delay * 0.08;
          const local =
            cycle < 0.2
              ? 1
              : cycle < 0.72
                ? Math.max(0, Math.min(1, (written - lineDelay) * 1.45))
                : Math.max(0, Math.min(1, (written - sweep(dot) * 0.68 - dot.delay * 0.14) * 3.2));
          const eased = local * local * (3 - 2 * local);
          const wind = destroy * destroy * (1 - rewrite);
          const windDir = vertical ? (dot.tx > cx ? 1 : -1) : 1;
          const gustX =
            windDir * wind * W * (0.22 + dot.delay * 0.35) +
            Math.cos(tt * 1.4 + dot.phase) * wind * W * 0.05;
          const gustY =
            -wind * H * (0.08 + sweep(dot) * 0.2) +
            Math.sin(tt * 1.7 + dot.phase) * wind * H * 0.07;
          const orbit = (1 - eased) * (vertical ? H : W) * 0.018;
          const px =
            dot.x + (dot.tx - dot.x) * eased + gustX + Math.cos(tt * 0.7 + dot.phase) * orbit;
          const py =
            dot.y + (dot.ty - dot.y) * eased + gustY + Math.sin(tt * 0.6 + dot.phase) * orbit;
          const alpha = (0.12 + eased * 0.86) * (1 - wind * 0.55) * iF;
          ctx!.beginPath();
          ctx!.arc(px, py, dot.size * (0.85 + eased * 0.85 + wind * 0.35), 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${pr},${pg},${pb},${Math.max(0, Math.min(1, alpha))})`;
          ctx!.shadowBlur = 8 + eased * 9 + wind * 12;
          ctx!.shadowColor = `rgba(${pr},${pg},${pb},0.72)`;
          ctx!.fill();
        }

        ctx!.shadowBlur = 0;
        ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.1 * iF})`;
        ctx!.lineWidth = 1;
        if (vertical) {
          ctx!.beginPath();
          ctx!.moveTo(cx - W * 0.16, H * 0.14);
          ctx!.lineTo(cx - W * 0.16, H * 0.86);
          ctx!.moveTo(cx + W * 0.16, H * 0.14);
          ctx!.lineTo(cx + W * 0.16, H * 0.86);
          ctx!.stroke();
        } else {
          ctx!.beginPath();
          ctx!.moveTo(W * 0.14, cy + H * 0.14);
          ctx!.lineTo(W * 0.86, cy + H * 0.14);
          ctx!.stroke();
        }

        canvasModeAnimRef.current = requestAnimationFrame(drawScriptures);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawScriptures);
    }

    /* ── WORD NEON: large word glows like a neon sign ─────────────── */
    if (cfg.mode === 'wordneon') {
      function drawWordNeon() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const t = performance.now() * 0.001;
        const w = wordRef.current || 'WORD';

        ctx!.fillStyle = `rgba(0,0,0,0.18)`;
        ctx!.fillRect(0, 0, W, H);

        const fontSize = Math.min(W * 0.22, H * 0.28, 140);
        const flicker = 0.85 + 0.15 * Math.sin(t * 11.3) * Math.sin(t * 7.1);
        const pulse = 1 + 0.04 * Math.sin(t * speed * 1.8);
        ctx!.save();
        ctx!.translate(W / 2, H / 2);
        ctx!.scale(pulse, pulse);

        // Chromatic aberration layers
        const offsets = [
          [-2, 0, `rgba(255,80,80,`],
          [2, 0, `rgba(80,80,255,`],
          [0, 0, `rgba(${pr},${pg},${pb},`],
        ] as const;
        for (const [ox, oy, colorPfx] of offsets) {
          for (let layer = 0; layer < 4; layer++) {
            const blur = [60, 30, 12, 0][layer];
            const alpha = [0.08, 0.12, 0.18, 0.9 * flicker * iF][layer];
            ctx!.shadowBlur = blur;
            ctx!.shadowColor = `rgba(${pr},${pg},${pb},${alpha})`;
            ctx!.font = `900 ${Math.round(fontSize)}px var(--font-serif, serif)`;
            ctx!.textAlign = 'center';
            ctx!.textBaseline = 'middle';
            ctx!.fillStyle = `${colorPfx}${alpha})`;
            ctx!.fillText(w.toUpperCase(), ox, oy);
          }
        }
        ctx!.restore();
        canvasModeAnimRef.current = requestAnimationFrame(drawWordNeon);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawWordNeon);
    }

    /* ── HOPEFEAR / DUALITY: word spins on Y-axis, flips to mirror on back ── */
    if (cfg.mode === 'hopefear') {
      function drawHopeFear() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const t = performance.now() * 0.001 * speed * 0.5;
        const w = wordRef.current || 'HOPE';

        ctx!.fillStyle = 'rgba(0,0,0,0.06)';
        ctx!.fillRect(0, 0, W, H);

        const fontSize = Math.min(W * 0.18, H * 0.22, 110);
        const angle = (t * 0.8) % (Math.PI * 2);
        const cosA = Math.cos(angle);
        // scaleX: positive when front-facing, negative = back
        const isFront = cosA >= 0;
        const scaleX = Math.abs(cosA);
        const alphaT = Math.abs(cosA);

        // Front: warm gold. Back: mirror + cool blue
        const [r1, g1, b1] = isFront ? [pr, pg, pb] : [80, 160, 255];

        ctx!.save();
        ctx!.translate(W / 2, H / 2);
        ctx!.scale(scaleX, 1);
        if (!isFront) ctx!.scale(-1, 1); // mirror on back face

        ctx!.shadowBlur = 28;
        ctx!.shadowColor = `rgba(${r1},${g1},${b1},0.6)`;
        ctx!.font = `900 ${Math.round(fontSize)}px var(--font-serif, serif)`;
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillStyle = `rgba(${r1},${g1},${b1},${Math.max(0.1, alphaT * iF)})`;
        ctx!.fillText(w.toUpperCase(), 0, 0);

        // Subtle reflection below
        ctx!.scale(1, -0.25);
        ctx!.globalAlpha = 0.12 * Math.abs(cosA);
        ctx!.fillText(w.toUpperCase(), 0, -fontSize * 0.6);
        ctx!.globalAlpha = 1;
        ctx!.restore();

        canvasModeAnimRef.current = requestAnimationFrame(drawHopeFear);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawHopeFear);
    }

    /* ── WORD ECHO: word repeats in concentric spiraling rings ──────── */
    if (cfg.mode === 'wordecho') {
      function drawWordEcho() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const t = performance.now() * 0.001 * speed * 0.4;
        const w = wordRef.current || 'ECHO';
        const N = Math.round(7 + cfg.complexity * 0.5);

        ctx!.fillStyle = 'rgba(0,0,0,0.04)';
        ctx!.fillRect(0, 0, W, H);

        const baseFont = Math.min(W * 0.18, H * 0.22, 110);
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';

        for (let i = N - 1; i >= 0; i--) {
          const progress = i / (N - 1);
          const scale = 0.3 + progress * 0.7 + 0.04 * Math.sin(t + i);
          const angle = progress * 0.8 + t * 0.3 * (i % 2 === 0 ? 1 : -1);
          const alpha = (1 - progress) * 0.85 * iF;
          const fontSize = baseFont * scale;

          ctx!.save();
          ctx!.translate(W / 2, H / 2);
          ctx!.rotate(angle);
          ctx!.shadowBlur = 20 * (1 - progress);
          ctx!.shadowColor = `rgba(${pr},${pg},${pb},${alpha * 0.8})`;
          ctx!.font = `900 ${Math.round(fontSize)}px var(--font-serif, serif)`;
          ctx!.fillStyle = `rgba(${pr},${pg},${pb},${Math.max(0, alpha)})`;
          ctx!.fillText(w.toUpperCase(), 0, 0);
          ctx!.restore();
        }

        canvasModeAnimRef.current = requestAnimationFrame(drawWordEcho);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawWordEcho);
    }

    /* ── WORD PARTICLE: word made of drifting glowing particles ─────── */
    if (cfg.mode === 'wordparticle') {
      const off = document.createElement('canvas');
      off.width = mc.width;
      off.height = mc.height;
      const offCtx = off.getContext('2d')!;
      const W0 = mc.width;
      const H0 = mc.height;
      const fontSize = Math.min(W0 * 0.22, H0 * 0.28, 130);
      offCtx.font = `900 ${Math.round(fontSize)}px var(--font-serif, serif)`;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#fff';
      offCtx.fillText((wordRef.current || 'WORD').toUpperCase(), W0 / 2, H0 / 2);

      const imgData = offCtx.getImageData(0, 0, W0, H0).data;
      type WPart = {
        x: number;
        y: number;
        ox: number;
        oy: number;
        phase: number;
        speed2: number;
        size: number;
      };
      const parts: WPart[] = [];
      const stride = Math.max(3, Math.round(10 - cfg.complexity * 0.5));
      for (let y = 0; y < H0; y += stride) {
        for (let x = 0; x < W0; x += stride) {
          const idx = (y * W0 + x) * 4;
          if (imgData[idx + 3] > 80) {
            parts.push({
              x,
              y,
              ox: x,
              oy: y,
              phase: Math.random() * Math.PI * 2,
              speed2: 0.3 + Math.random() * 0.7,
              size: 1 + Math.random() * 2,
            });
          }
        }
      }

      let lastWord = wordRef.current;
      function drawWordParticle() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const t = performance.now() * 0.001 * speed;

        // Rebuild if word changed
        if (wordRef.current !== lastWord) {
          lastWord = wordRef.current;
          off.width = W;
          off.height = H;
          const fs2 = Math.min(W * 0.22, H * 0.28, 130);
          offCtx.clearRect(0, 0, W, H);
          offCtx.font = `900 ${Math.round(fs2)}px var(--font-serif, serif)`;
          offCtx.textAlign = 'center';
          offCtx.textBaseline = 'middle';
          offCtx.fillStyle = '#fff';
          offCtx.fillText((wordRef.current || 'WORD').toUpperCase(), W / 2, H / 2);
          const newData = offCtx.getImageData(0, 0, W, H).data;
          parts.length = 0;
          const st2 = Math.max(3, Math.round(10 - cfg.complexity * 0.5));
          for (let y2 = 0; y2 < H; y2 += st2) {
            for (let x2 = 0; x2 < W; x2 += st2) {
              const idx2 = (y2 * W + x2) * 4;
              if (newData[idx2 + 3] > 80) {
                parts.push({
                  x: x2,
                  y: y2,
                  ox: x2,
                  oy: y2,
                  phase: Math.random() * Math.PI * 2,
                  speed2: 0.3 + Math.random() * 0.7,
                  size: 1 + Math.random() * 2,
                });
              }
            }
          }
        }

        ctx!.fillStyle = 'rgba(0,0,0,0.12)';
        ctx!.fillRect(0, 0, W, H);

        for (const p of parts) {
          const drift = Math.sin(t * p.speed2 + p.phase) * 3 * iF;
          const driftY = Math.cos(t * p.speed2 * 0.7 + p.phase) * 2 * iF;
          const px = p.ox + drift;
          const py = p.oy + driftY;
          const alpha = 0.5 + 0.5 * Math.sin(t * p.speed2 + p.phase);
          ctx!.beginPath();
          ctx!.arc(px, py, p.size, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${pr},${pg},${pb},${alpha * iF})`;
          ctx!.shadowBlur = 6;
          ctx!.shadowColor = `rgba(${pr},${pg},${pb},0.5)`;
          ctx!.fill();
        }

        canvasModeAnimRef.current = requestAnimationFrame(drawWordParticle);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawWordParticle);
    }

    /* ── WORD WEAVE: flowing light traces the letter outlines ─────────── */
    if (cfg.mode === 'wordweave') {
      const off2 = document.createElement('canvas');
      off2.width = mc.width;
      off2.height = mc.height;
      const offCtx2 = off2.getContext('2d')!;
      const W0 = mc.width;
      const H0 = mc.height;
      const fontSize = Math.min(W0 * 0.22, H0 * 0.28, 130);
      offCtx2.font = `900 ${Math.round(fontSize)}px var(--font-serif, serif)`;
      offCtx2.textAlign = 'center';
      offCtx2.textBaseline = 'middle';
      offCtx2.fillStyle = '#fff';
      offCtx2.fillText((wordRef.current || 'WORD').toUpperCase(), W0 / 2, H0 / 2);
      const imgData2 = offCtx2.getImageData(0, 0, W0, H0).data;

      // Sample outline pixels (edge pixels only)
      type WEdge = { x: number; y: number };
      const edgePts: WEdge[] = [];
      for (let y = 1; y < H0 - 1; y += 2) {
        for (let x = 1; x < W0 - 1; x += 2) {
          const idx = (y * W0 + x) * 4;
          const alpha = imgData2[idx + 3];
          if (alpha > 60) {
            // Check if any neighbour is transparent (edge detection)
            const neighbours = [
              imgData2[((y - 1) * W0 + x) * 4 + 3],
              imgData2[((y + 1) * W0 + x) * 4 + 3],
              imgData2[(y * W0 + x - 1) * 4 + 3],
              imgData2[(y * W0 + x + 1) * 4 + 3],
            ];
            if (neighbours.some((n) => n < 60)) {
              edgePts.push({ x, y });
            }
          }
        }
      }

      const NUM_TRACERS = Math.round(3 + cfg.complexity * 0.8);
      type Tracer = { idx: number; trail: { x: number; y: number }[]; speed3: number };
      const tracers: Tracer[] = [];
      for (let i = 0; i < NUM_TRACERS; i++) {
        tracers.push({
          idx: Math.floor(Math.random() * Math.max(1, edgePts.length)),
          trail: [],
          speed3: 1 + Math.random() * 2,
        });
      }

      let lastWord2 = wordRef.current;
      function drawWordWeave() {
        if (!canvasModeActiveRef.current) return;

        // Rebuild on word change
        if (wordRef.current !== lastWord2) {
          lastWord2 = wordRef.current;
          off2.width = mc!.width;
          off2.height = mc!.height;
          const fs3 = Math.min(off2.width * 0.22, off2.height * 0.28, 130);
          offCtx2.clearRect(0, 0, off2.width, off2.height);
          offCtx2.font = `900 ${Math.round(fs3)}px var(--font-serif, serif)`;
          offCtx2.textAlign = 'center';
          offCtx2.textBaseline = 'middle';
          offCtx2.fillStyle = '#fff';
          offCtx2.fillText(
            (wordRef.current || 'WORD').toUpperCase(),
            off2.width / 2,
            off2.height / 2,
          );
          const newData2 = offCtx2.getImageData(0, 0, off2.width, off2.height).data;
          edgePts.length = 0;
          for (let y = 1; y < off2.height - 1; y += 2) {
            for (let x = 1; x < off2.width - 1; x += 2) {
              const idx = (y * off2.width + x) * 4;
              if (newData2[idx + 3] > 60) {
                const n = [
                  newData2[((y - 1) * off2.width + x) * 4 + 3],
                  newData2[((y + 1) * off2.width + x) * 4 + 3],
                  newData2[(y * off2.width + x - 1) * 4 + 3],
                  newData2[(y * off2.width + x + 1) * 4 + 3],
                ];
                if (n.some((v) => v < 60)) edgePts.push({ x, y });
              }
            }
          }
        }

        ctx!.fillStyle = 'rgba(0,0,0,0.06)';
        ctx!.fillRect(0, 0, mc!.width, mc!.height);

        if (edgePts.length === 0) {
          canvasModeAnimRef.current = requestAnimationFrame(drawWordWeave);
          return;
        }

        for (const tr of tracers) {
          const steps = Math.round(tr.speed3 * speed * 2);
          for (let s = 0; s < steps; s++) {
            tr.idx = (tr.idx + 1) % edgePts.length;
            const pt = edgePts[tr.idx];
            tr.trail.push({ x: pt.x, y: pt.y });
            if (tr.trail.length > 32) tr.trail.shift();
          }

          if (tr.trail.length > 1) {
            ctx!.beginPath();
            ctx!.moveTo(tr.trail[0].x, tr.trail[0].y);
            for (let j = 1; j < tr.trail.length; j++) {
              ctx!.lineTo(tr.trail[j].x, tr.trail[j].y);
            }
            const headAlpha = 0.9 * iF;
            const gradient = ctx!.createLinearGradient(
              tr.trail[0].x,
              tr.trail[0].y,
              tr.trail[tr.trail.length - 1].x,
              tr.trail[tr.trail.length - 1].y,
            );
            gradient.addColorStop(0, `rgba(${pr},${pg},${pb},0)`);
            gradient.addColorStop(1, `rgba(${pr},${pg},${pb},${headAlpha})`);
            ctx!.strokeStyle = gradient;
            ctx!.lineWidth = 2.5;
            ctx!.shadowBlur = 14;
            ctx!.shadowColor = `rgba(${pr},${pg},${pb},0.7)`;
            ctx!.stroke();
          }
        }

        canvasModeAnimRef.current = requestAnimationFrame(drawWordWeave);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawWordWeave);
    }

    /* ── METAMORPH: butterfly → bird → fish → spiral → loop ─────── */
    if (cfg.mode === 'metamorph') {
      const N = 120;
      // Each shape: function(i, N) => [x, y] in normalised [-1,1] coords
      function butterfly(i: number): [number, number] {
        const t = (i / N) * Math.PI * 2;
        const r = Math.abs(Math.sin(2 * t));
        return [Math.cos(t) * r, Math.sin(t) * r * 0.85];
      }
      function bird(i: number): [number, number] {
        const t = (i / N) * Math.PI * 2;
        // V-spread wings
        const x = Math.sin(t);
        const y = -Math.abs(Math.cos(t)) * 0.45 + Math.sin(t * 0.5) * 0.15;
        return [x, y];
      }
      function fish(i: number): [number, number] {
        const t = (i / N) * Math.PI * 2;
        const tail = t > Math.PI ? -Math.sin(t * 2) * 0.25 : 0;
        return [Math.cos(t) * 0.85 + tail, Math.sin(t) * 0.42];
      }
      function spiral(i: number): [number, number] {
        const t = (i / N) * Math.PI * 2;
        const r = 0.4 + 0.55 * Math.abs(Math.sin(t * 2.5));
        return [Math.cos(t) * r, Math.sin(t) * r];
      }
      const shapes = [butterfly, bird, fish, spiral, butterfly];
      const HOLD = 1.2; // seconds paused at each shape
      const TRANSIT = 2.8; // seconds morphing
      const CYCLE = HOLD + TRANSIT;
      const NUM_SHAPES = shapes.length - 1;

      function drawMetamorph() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const tSec = performance.now() * 0.001 * speed;
        const totalT = CYCLE * NUM_SHAPES;
        const phase = (tSec % totalT) / totalT;
        const shapeIdx = Math.min(Math.floor(phase * NUM_SHAPES), NUM_SHAPES - 1);
        const local = phase * NUM_SHAPES - shapeIdx;
        // local: 0..HOLD/(HOLD+TRANSIT) = hold zone, then ease into next
        const holdFrac = HOLD / CYCLE;
        const morphT = local < holdFrac ? 0 : (local - holdFrac) / (1 - holdFrac);
        const eased = morphT < 0.5 ? 4 * morphT * morphT * morphT : 1 - (-2 * morphT + 2) ** 3 / 2;

        ctx!.fillStyle = 'rgba(0,0,0,0.055)';
        ctx!.fillRect(0, 0, W, H);

        const scale = Math.min(W, H) * 0.4;
        const rot = tSec * 0.08;

        ctx!.save();
        ctx!.translate(W / 2, H / 2);
        ctx!.rotate(rot);
        ctx!.beginPath();
        for (let i = 0; i <= N; i++) {
          const [ax, ay] = shapes[shapeIdx](i % N);
          const [bx, by] = shapes[shapeIdx + 1](i % N);
          const x = (ax + (bx - ax) * eased) * scale;
          const y = (ay + (by - ay) * eased) * scale;
          if (i === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.closePath();
        ctx!.shadowBlur = 22;
        ctx!.shadowColor = `rgba(${pr},${pg},${pb},0.75)`;
        ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.85 * iF})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();
        // inner glow fill
        ctx!.fillStyle = `rgba(${pr},${pg},${pb},${0.04 * iF})`;
        ctx!.fill();
        ctx!.restore();

        canvasModeAnimRef.current = requestAnimationFrame(drawMetamorph);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawMetamorph);
    }

    /* ── CHRYSALIS: sacred geometry shapes morph through each other ── */
    if (cfg.mode === 'chrysalis') {
      // r(theta) for each polygon type — returns normalised radius
      function polyR(sides: number, theta: number): number {
        const seg = (Math.PI * 2) / sides;
        return (
          Math.cos(Math.PI / sides) / Math.cos((((theta % seg) + seg) % seg) - Math.PI / sides)
        );
      }
      const shapeSeq: Array<(t: number) => number> = [
        () => 1, // circle
        (t) => Math.min(polyR(3, t), 2.2), // triangle
        (t) => Math.abs(Math.cos(3 * t)) * 0.6 + 0.4, // rose 6 petals
        (t) => Math.min(polyR(6, t), 2.2), // hexagon
        (t) => 0.55 + 0.45 * Math.abs(Math.sin(6 * t)), // star
        (t) => Math.abs(Math.cos(4 * t)) * 0.5 + 0.5, // 8-petal rose
        () => 1, // back to circle
      ];
      const N2 = 200;
      const HOLD2 = 0.9;
      const TRANSIT2 = 2.4;
      const CYCLE2 = HOLD2 + TRANSIT2;
      const NUM_S = shapeSeq.length - 1;

      function drawChrysalis() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const tSec = performance.now() * 0.001 * speed;
        const totalT2 = CYCLE2 * NUM_S;
        const phase2 = (tSec % totalT2) / totalT2;
        const sIdx = Math.min(Math.floor(phase2 * NUM_S), NUM_S - 1);
        const local2 = phase2 * NUM_S - sIdx;
        const holdFrac2 = HOLD2 / CYCLE2;
        const morphT2 = local2 < holdFrac2 ? 0 : (local2 - holdFrac2) / (1 - holdFrac2);
        const eased2 =
          morphT2 < 0.5 ? 4 * morphT2 * morphT2 * morphT2 : 1 - (-2 * morphT2 + 2) ** 3 / 2;

        ctx!.fillStyle = 'rgba(0,0,0,0.04)';
        ctx!.fillRect(0, 0, W, H);

        const baseR = Math.min(W, H) * 0.38;
        const rot2 = tSec * 0.06 * (sIdx % 2 === 0 ? 1 : -1);
        // Draw multiple rings for depth
        for (let ring = 0; ring < 3; ring++) {
          const rScale = 1 - ring * 0.25;
          const alpha = (1 - ring * 0.28) * iF;
          ctx!.save();
          ctx!.translate(W / 2, H / 2);
          ctx!.rotate(rot2 + ring * 0.5);
          ctx!.beginPath();
          for (let i = 0; i <= N2; i++) {
            const theta = (i / N2) * Math.PI * 2;
            const ra = shapeSeq[sIdx](theta);
            const rb = shapeSeq[sIdx + 1](theta);
            const r = (ra + (rb - ra) * eased2) * baseR * rScale;
            const x = Math.cos(theta) * r;
            const y = Math.sin(theta) * r;
            if (i === 0) ctx!.moveTo(x, y);
            else ctx!.lineTo(x, y);
          }
          ctx!.closePath();
          ctx!.shadowBlur = 18 - ring * 4;
          ctx!.shadowColor = `rgba(${pr},${pg},${pb},${0.6 * alpha})`;
          ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${alpha * 0.9})`;
          ctx!.lineWidth = 2 - ring * 0.4;
          ctx!.stroke();
          ctx!.restore();
        }

        canvasModeAnimRef.current = requestAnimationFrame(drawChrysalis);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawChrysalis);
    }

    /* ── BREATHFORM: a living geometric organism that expands/contracts ── */
    if (cfg.mode === 'chrysalisrings') {
      const rings = [
        { radius: 0.34, phase: 0, width: 2.4 },
        { radius: 0.53, phase: Math.PI / 3, width: 2.0 },
        { radius: 0.72, phase: (Math.PI * 2) / 3, width: 1.6 },
      ];
      const smooth01 = (x: number) => {
        const v = Math.max(0, Math.min(1, x));
        return v * v * (3 - 2 * v);
      };
      const transformPhase = (loop: number) => {
        if (loop < 0.24) return 0;
        if (loop < 0.46) return smooth01((loop - 0.24) / 0.22);
        if (loop < 0.74) return 1;
        return 1 - smooth01((loop - 0.74) / 0.26);
      };

      function drawChrysalisRings() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const cx = W / 2;
        const cy = H / 2;
        const baseR = Math.min(W, H) * 0.46;
        const tSec = modeSeconds() * speed;
        const loop = (tSec * 0.075) % 1;
        const lift = transformPhase(loop);
        const spin = lift * tSec * 0.62;

        ctx!.fillStyle = 'rgba(0,0,0,0.055)';
        ctx!.fillRect(0, 0, W, H);

        if (_distortActive && (_distortMode === 'ripple' || _distortMode === 'light')) {
          const lx = cx + _distortWorldX;
          const ly = cy - _distortWorldY;
          const g = ctx!.createRadialGradient(lx, ly, 0, lx, ly, baseR * 0.42);
          g.addColorStop(0, `rgba(${pr},${pg},${pb},${0.18 * iF})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx!.fillStyle = g;
          ctx!.fillRect(0, 0, W, H);
        }

        rings.forEach((ring, idx) => {
          const tilt = 1 - lift * (0.55 + idx * 0.08);
          const spread = 1 + lift * (idx - 1) * 0.08;
          const rot = ring.phase + spin * (idx % 2 === 0 ? 1 : -1);
          const auraSpread = 1 + cfg.glow * 0.018;
          const rx = baseR * ring.radius * spread * auraSpread;
          const ry = rx * Math.max(0.18, tilt);
          const alpha = (0.78 - idx * 0.12) * iF;

          ctx!.save();
          ctx!.translate(cx, cy);
          ctx!.rotate(rot);
          ctx!.beginPath();
          ctx!.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx!.shadowBlur = 22 + cfg.glow * 1.6;
          ctx!.shadowColor = `rgba(${pr},${pg},${pb},${0.55 * alpha})`;
          ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${alpha})`;
          ctx!.lineWidth = ring.width;
          ctx!.stroke();

          ctx!.restore();
        });

        canvasModeAnimRef.current = requestAnimationFrame(drawChrysalisRings);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawChrysalisRings);
    }

    if (cfg.mode === 'breathform') {
      const N3 = 160;
      const PETALS = Math.max(3, Math.round(cfg.symmetry));

      function drawBreathform() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width;
        const H = mc!.height;
        const tSec = performance.now() * 0.001 * speed;

        ctx!.fillStyle = 'rgba(0,0,0,0.035)';
        ctx!.fillRect(0, 0, W, H);

        const baseR = Math.min(W, H) * 0.38;
        // Breathe: slow inhale/exhale
        const _breath = 0.78 + 0.22 * Math.sin(tSec * 0.7);
        // Pulsing complexity
        const warp = 0.15 + 0.12 * Math.sin(tSec * 0.4) * iF;

        // Draw multiple overlapping layers
        for (let layer = 0; layer < 4; layer++) {
          const layerPhase = layer * 0.55;
          const lBreath = 0.78 + 0.22 * Math.sin(tSec * 0.7 + layerPhase);
          const lAlpha = (0.6 - layer * 0.12) * iF;
          const lScale = (1 - layer * 0.18) * lBreath;
          const lRot = tSec * (0.04 + layer * 0.025) * (layer % 2 === 0 ? 1 : -1);

          ctx!.save();
          ctx!.translate(W / 2, H / 2);
          ctx!.rotate(lRot);
          ctx!.beginPath();

          for (let i = 0; i <= N3; i++) {
            const theta = (i / N3) * Math.PI * 2;
            // Rose-like with breathing warp
            const rose = Math.abs(Math.cos(PETALS * theta * 0.5));
            const harmonic = 1 + warp * Math.sin(PETALS * 3 * theta + tSec);
            const r = baseR * lScale * (0.3 + 0.7 * rose) * harmonic;
            const x = Math.cos(theta) * r;
            const y = Math.sin(theta) * r;
            if (i === 0) ctx!.moveTo(x, y);
            else ctx!.lineTo(x, y);
          }

          ctx!.closePath();
          ctx!.shadowBlur = 24 - layer * 4;
          ctx!.shadowColor = `rgba(${pr},${pg},${pb},${lAlpha})`;
          ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${lAlpha * 0.9})`;
          ctx!.lineWidth = 1.8 - layer * 0.3;
          ctx!.stroke();
          ctx!.fillStyle = `rgba(${pr},${pg},${pb},${lAlpha * 0.03})`;
          ctx!.fill();
          ctx!.restore();
        }

        canvasModeAnimRef.current = requestAnimationFrame(drawBreathform);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawBreathform);
    }

    /* ── CLOCK3D: Clocks of Infinity — astrolabe-style concentric rings ── */
    if (cfg.mode === 'clock3d') {
      const RING_DATA = [
        { r: 0.13, spd: 7.2, dir: 1, notch: 12, sz: 5.5 },
        { r: 0.24, spd: 4.4, dir: -1, notch: 18, sz: 4.5 },
        { r: 0.36, spd: 2.8, dir: 1, notch: 24, sz: 4.0 },
        { r: 0.49, spd: 1.7, dir: -1, notch: 36, sz: 3.2 },
        { r: 0.63, spd: 1.1, dir: 1, notch: 48, sz: 2.5 },
        { r: 0.77, spd: 0.6, dir: -1, notch: 60, sz: 2.0 },
        { r: 0.89, spd: 0.3, dir: 1, notch: 72, sz: 1.5 },
      ];
      function drawClock3d() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const baseR = Math.min(W, H) * 0.46;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.07)';
        ctx!.fillRect(0, 0, W, H);
        const ng = ctx!.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.08);
        ng.addColorStop(0, `rgba(${pr},${pg},${pb},${0.95 * iF})`);
        ng.addColorStop(0.4, `rgba(${pr},${pg},${pb},${0.35 * iF})`);
        ng.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = ng;
        ctx!.beginPath();
        ctx!.arc(cx, cy, baseR * 0.08, 0, Math.PI * 2);
        ctx!.fill();
        RING_DATA.forEach((ring, ri) => {
          const r = baseR * ring.r;
          const a0 = tSec * ring.spd * ring.dir * 0.14 * speed;
          ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.14 * iF})`;
          ctx!.lineWidth = 0.7;
          ctx!.beginPath();
          ctx!.arc(cx, cy, r, 0, Math.PI * 2);
          ctx!.stroke();
          for (let n = 0; n < ring.notch; n++) {
            const a = (n / ring.notch) * Math.PI * 2 + a0;
            const major = n % (ring.notch / 12) < 1;
            const tLen = r * (major ? 0.07 : 0.025);
            const talpha = major ? 0.55 * iF : 0.18 * iF;
            ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${talpha})`;
            ctx!.lineWidth = major ? 1.3 : 0.5;
            ctx!.beginPath();
            ctx!.moveTo(cx + (r - tLen) * Math.cos(a), cy + (r - tLen) * Math.sin(a));
            ctx!.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
            ctx!.stroke();
          }
          const pA = a0 * 0.7 + ri * 0.9;
          const pX = cx + r * Math.cos(pA);
          const pY = cy + r * Math.sin(pA);
          const pSz = ring.sz * (0.85 + 0.15 * Math.sin(tSec * 2.1 + ri * 1.3));
          const trailSpan = 0.35 * Math.PI;
          const trailDir = ring.dir > 0 ? -1 : 1;
          const tGrad = ctx!.createLinearGradient(
            cx + r * Math.cos(pA + trailDir * trailSpan),
            cy + r * Math.sin(pA + trailDir * trailSpan),
            pX,
            pY,
          );
          tGrad.addColorStop(0, 'rgba(0,0,0,0)');
          tGrad.addColorStop(1, `rgba(${pr},${pg},${pb},${0.55 * iF})`);
          ctx!.strokeStyle = tGrad;
          ctx!.lineWidth = pSz * 0.7;
          ctx!.lineCap = 'round';
          ctx!.beginPath();
          ctx!.arc(cx, cy, r, pA + trailDir * trailSpan, pA, trailDir < 0);
          ctx!.stroke();
          const pg2 = ctx!.createRadialGradient(pX, pY, 0, pX, pY, pSz * 5);
          pg2.addColorStop(0, `rgba(${pr},${pg},${pb},${0.9 * iF})`);
          pg2.addColorStop(0.4, `rgba(${pr},${pg},${pb},${0.3 * iF})`);
          pg2.addColorStop(1, 'rgba(0,0,0,0)');
          ctx!.fillStyle = pg2;
          ctx!.beginPath();
          ctx!.arc(pX, pY, pSz * 5, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = `rgba(255,255,255,${iF * 0.95})`;
          ctx!.beginPath();
          ctx!.arc(pX, pY, pSz * 0.45, 0, Math.PI * 2);
          ctx!.fill();
        });
        canvasModeAnimRef.current = requestAnimationFrame(drawClock3d);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawClock3d);
    }

    /* ── ATOMLIGHT: elliptical orbitals with racing electron nodes ── */
    if (cfg.mode === 'atomlight') {
      const ORBS = [
        { tilt: 0, axisA: 0.92, axisB: 0.48, spd: 2.8, phase: 0, sz: 5.5 },
        { tilt: 0.6, axisA: 0.78, axisB: 0.38, spd: 1.7, phase: Math.PI, sz: 4.5 },
        { tilt: 1.1, axisA: 0.88, axisB: 0.28, spd: 4.1, phase: Math.PI / 2, sz: 3.5 },
        { tilt: -0.5, axisA: 0.65, axisB: 0.45, spd: 0.9, phase: Math.PI * 1.5, sz: 3.0 },
      ];
      function drawAtomLight() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const baseR = Math.min(W, H) * 0.42;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.05)';
        ctx!.fillRect(0, 0, W, H);
        const nucG = ctx!.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.12);
        nucG.addColorStop(0, `rgba(255,255,255,${0.9 * iF})`);
        nucG.addColorStop(0.25, `rgba(${pr},${pg},${pb},${0.65 * iF})`);
        nucG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = nucG;
        ctx!.beginPath();
        ctx!.arc(cx, cy, baseR * 0.12, 0, Math.PI * 2);
        ctx!.fill();
        ORBS.forEach((orb) => {
          const aX = baseR * orb.axisA;
          const aY = baseR * orb.axisB;
          const cosT = Math.cos(orb.tilt);
          const sinT = Math.sin(orb.tilt);
          ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.18 * iF})`;
          ctx!.lineWidth = 0.8;
          ctx!.beginPath();
          for (let n = 0; n <= 120; n++) {
            const a = (n / 120) * Math.PI * 2;
            const ex = aX * Math.cos(a),
              ey = aY * Math.sin(a);
            const rx = cx + ex * cosT - ey * sinT;
            const ry = cy + ex * sinT + ey * cosT;
            n === 0 ? ctx!.moveTo(rx, ry) : ctx!.lineTo(rx, ry);
          }
          ctx!.closePath();
          ctx!.stroke();
          const eAngle = tSec * orb.spd * speed * 0.6 + orb.phase;
          const ex0 = aX * Math.cos(eAngle),
            ey0 = aY * Math.sin(eAngle);
          const eX = cx + ex0 * cosT - ey0 * sinT;
          const eY = cy + ex0 * sinT + ey0 * cosT;
          for (let ti = 0; ti < 30; ti++) {
            const ta = eAngle - (ti / 30) * Math.PI * 0.6;
            const tex = aX * Math.cos(ta),
              tey = aY * Math.sin(ta);
            const tX = cx + tex * cosT - tey * sinT;
            const tY = cx + tex * sinT + tey * cosT + (cy - cx);
            const talpha = (1 - ti / 30) * 0.5 * iF;
            ctx!.fillStyle = `rgba(${pr},${pg},${pb},${talpha})`;
            ctx!.beginPath();
            ctx!.arc(tX, tY, orb.sz * (1 - ti / 30) * 0.35, 0, Math.PI * 2);
            ctx!.fill();
          }
          const eGlow = ctx!.createRadialGradient(eX, eY, 0, eX, eY, orb.sz * 6);
          eGlow.addColorStop(0, `rgba(${pr},${pg},${pb},${iF})`);
          eGlow.addColorStop(0.35, `rgba(${pr},${pg},${pb},${0.35 * iF})`);
          eGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx!.fillStyle = eGlow;
          ctx!.beginPath();
          ctx!.arc(eX, eY, orb.sz * 6, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = `rgba(255,255,255,${iF})`;
          ctx!.beginPath();
          ctx!.arc(eX, eY, orb.sz * 0.5, 0, Math.PI * 2);
          ctx!.fill();
        });
        canvasModeAnimRef.current = requestAnimationFrame(drawAtomLight);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawAtomLight);
    }

    /* ── BUTTERFLY: parametric butterfly curves in duet ── */
    if (cfg.mode === 'butterfly') {
      function drawButterflyMode() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const baseR = Math.min(W, H) * 0.36;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.04)';
        ctx!.fillRect(0, 0, W, H);
        const orbit = baseR * 0.28;
        for (let wing = 0; wing < 2; wing++) {
          const offsetAngle = tSec * 0.18 * speed + wing * Math.PI;
          const ocx = cx + orbit * Math.cos(offsetAngle);
          const ocy = cy + orbit * Math.sin(offsetAngle);
          const scale = baseR * 0.62;
          const wingPhase = wing * Math.PI * 0.5;
          const hue = (wing * 0.5 + tSec * 0.02 * speed) % 1;
          const cr = (pr + (255 - pr) * hue) | 0;
          const cg = (pg + (255 - pg) * (1 - hue)) | 0;
          ctx!.beginPath();
          for (let n = 0; n <= 300; n++) {
            const theta = (n / 300) * Math.PI * 4;
            const r2 =
              Math.exp(Math.sin(theta)) -
              2 * Math.cos(4 * theta) +
              Math.sin((2 * theta - Math.PI) / 24) ** 5;
            const rNorm = r2 * scale * 0.22;
            const angle = theta + wingPhase + tSec * 0.08 * speed;
            const bpx = ocx + rNorm * Math.cos(angle);
            const bpy = ocy + rNorm * Math.sin(angle);
            n === 0 ? ctx!.moveTo(bpx, bpy) : ctx!.lineTo(bpx, bpy);
          }
          ctx!.strokeStyle = `rgba(${cr},${cg},${pb},${0.7 * iF})`;
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
          const cg2 = ctx!.createRadialGradient(ocx, ocy, 0, ocx, ocy, scale * 0.15);
          cg2.addColorStop(0, `rgba(${pr},${pg},${pb},${0.8 * iF})`);
          cg2.addColorStop(1, 'rgba(0,0,0,0)');
          ctx!.fillStyle = cg2;
          ctx!.beginPath();
          ctx!.arc(ocx, ocy, scale * 0.15, 0, Math.PI * 2);
          ctx!.fill();
        }
        const a1 = tSec * 0.18 * speed;
        const c1x = cx + orbit * Math.cos(a1),
          c1y = cy + orbit * Math.sin(a1);
        const c2x = cx + orbit * Math.cos(a1 + Math.PI),
          c2y = cy + orbit * Math.sin(a1 + Math.PI);
        const lineGrad = ctx!.createLinearGradient(c1x, c1y, c2x, c2y);
        lineGrad.addColorStop(0, `rgba(${pr},${pg},${pb},${0.4 * iF})`);
        lineGrad.addColorStop(0.5, `rgba(${pr},${pg},${pb},${0.08 * iF})`);
        lineGrad.addColorStop(1, `rgba(${pr},${pg},${pb},${0.4 * iF})`);
        ctx!.strokeStyle = lineGrad;
        ctx!.lineWidth = 0.8;
        ctx!.setLineDash([4, 6]);
        ctx!.beginPath();
        ctx!.moveTo(c1x, c1y);
        ctx!.lineTo(c2x, c2y);
        ctx!.stroke();
        ctx!.setLineDash([]);
        canvasModeAnimRef.current = requestAnimationFrame(drawButterflyMode);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawButterflyMode);
    }

    /* ── ORBITDANCE: 3D-projected elliptical orbits with dancing objects ── */
    if (cfg.mode === 'orbitdance') {
      const DANCERS = [
        { a: 0.85, b: 0.38, tilt: 0, phase: 0, spd: 1.3 },
        { a: 0.7, b: 0.45, tilt: Math.PI / 3, phase: Math.PI * 0.7, spd: 2.1 },
        { a: 0.9, b: 0.3, tilt: Math.PI * 0.6, phase: Math.PI * 1.3, spd: 0.8 },
        { a: 0.55, b: 0.48, tilt: Math.PI, phase: Math.PI * 0.3, spd: 3.0 },
        { a: 0.75, b: 0.35, tilt: Math.PI * 1.4, phase: Math.PI * 0.9, spd: 1.6 },
        { a: 0.65, b: 0.42, tilt: Math.PI * 0.2, phase: Math.PI * 1.7, spd: 2.5 },
      ];
      function drawOrbitDance() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const baseR = Math.min(W, H) * 0.44;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.05)';
        ctx!.fillRect(0, 0, W, H);
        const globalRot = tSec * 0.04 * speed;
        DANCERS.forEach((d, di) => {
          const aX = baseR * d.a,
            aY = baseR * d.b;
          const tilt = d.tilt + globalRot;
          const cosT = Math.cos(tilt),
            sinT = Math.sin(tilt);
          ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.12 * iF})`;
          ctx!.lineWidth = 0.7;
          ctx!.beginPath();
          for (let n = 0; n <= 80; n++) {
            const a = (n / 80) * Math.PI * 2;
            const ex = aX * Math.cos(a),
              ey = aY * Math.sin(a);
            const rx = cx + ex * cosT - ey * sinT,
              ry = cy + ex * sinT + ey * cosT;
            n === 0 ? ctx!.moveTo(rx, ry) : ctx!.lineTo(rx, ry);
          }
          ctx!.closePath();
          ctx!.stroke();
          const objA = tSec * d.spd * speed * 0.5 + d.phase;
          const ox = aX * Math.cos(objA),
            oy = aY * Math.sin(objA);
          const dX = cx + ox * cosT - oy * sinT,
            dY = cy + ox * sinT + oy * cosT;
          const depth = Math.sin(objA) * 0.5 + 0.5;
          const scaledSz = 5 * (0.5 + 0.5 * depth);
          const dalpha = (0.4 + 0.6 * depth) * iF;
          for (let ti = 0; ti < 20; ti++) {
            const ta = objA - (ti / 20) * Math.PI * 0.4;
            const tex = aX * Math.cos(ta),
              tey = aY * Math.sin(ta);
            const tX = cx + tex * cosT - tey * sinT,
              tY = cy + tex * sinT + tey * cosT;
            ctx!.fillStyle = `rgba(${pr},${pg},${pb},${(1 - ti / 20) * 0.35 * iF})`;
            ctx!.beginPath();
            ctx!.arc(tX, tY, scaledSz * (1 - ti / 20) * 0.4, 0, Math.PI * 2);
            ctx!.fill();
          }
          const dg = ctx!.createRadialGradient(dX, dY, 0, dX, dY, scaledSz * 5);
          dg.addColorStop(0, `rgba(${pr},${pg},${pb},${dalpha * 0.9})`);
          dg.addColorStop(0.4, `rgba(${pr},${pg},${pb},${dalpha * 0.3})`);
          dg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx!.fillStyle = dg;
          ctx!.beginPath();
          ctx!.arc(dX, dY, scaledSz * 5, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = `rgba(255,255,255,${dalpha})`;
          ctx!.save();
          ctx!.translate(dX, dY);
          ctx!.rotate(tSec * 1.5 + di);
          ctx!.beginPath();
          ctx!.moveTo(0, -scaledSz * 0.55);
          ctx!.lineTo(scaledSz * 0.4, 0);
          ctx!.lineTo(0, scaledSz * 0.55);
          ctx!.lineTo(-scaledSz * 0.4, 0);
          ctx!.closePath();
          ctx!.fill();
          ctx!.restore();
        });
        canvasModeAnimRef.current = requestAnimationFrame(drawOrbitDance);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawOrbitDance);
    }

    /* ── RIPPLEMORPH: psychedelic ripple rings that metamorphose ── */
    if (cfg.mode === 'ripplemorph') {
      const NUM_RINGS2 = Math.max(6, Math.round(cfg.complexity * 0.9));
      function drawRippleMorph() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const baseR = Math.min(W, H) * 0.5;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.06)';
        ctx!.fillRect(0, 0, W, H);
        for (let ri = 0; ri < NUM_RINGS2; ri++) {
          const frac = ((ri + tSec * speed * 0.25) % NUM_RINGS2) / NUM_RINGS2;
          const r = baseR * (0.05 + frac * 0.95);
          const ralpha = (1 - frac) * 0.7 * iF;
          const morphPhase = (tSec * 0.15 * speed + ri * 0.11) % 3;
          const sides2 = morphPhase < 1 ? 6 : morphPhase < 2 ? 12 : 0;
          const starFactor = morphPhase < 1 ? morphPhase : morphPhase < 2 ? 2 - morphPhase : 0;
          const hueShift = (ri / NUM_RINGS2 + tSec * 0.05 * speed) % 1;
          const cr = (pr + (255 - pr) * Math.sin(hueShift * Math.PI)) | 0;
          const cg = (pg + (255 - pg) * Math.sin((hueShift + 0.33) * Math.PI)) | 0;
          const cb = (pb + (255 - pb) * Math.sin((hueShift + 0.66) * Math.PI)) | 0;
          ctx!.strokeStyle = `rgba(${cr},${cg},${cb},${ralpha})`;
          ctx!.lineWidth = 1.5 * (1 - frac * 0.5);
          ctx!.beginPath();
          for (let n = 0; n <= 120; n++) {
            const a = (n / 120) * Math.PI * 2;
            let rad = r;
            if (sides2 > 0) {
              const seg = (Math.PI * 2) / sides2;
              const polyR2 =
                Math.cos(Math.PI / sides2) / Math.cos((((a % seg) + seg) % seg) - Math.PI / sides2);
              const starR = 1 + starFactor * 0.45 * Math.cos(sides2 * a + tSec * speed);
              rad = r * (polyR2 * (1 - starFactor * 0.5) + starR * starFactor * 0.5);
            }
            const rpx = cx + rad * Math.cos(a),
              rpy = cy + rad * Math.sin(a);
            n === 0 ? ctx!.moveTo(rpx, rpy) : ctx!.lineTo(rpx, rpy);
          }
          ctx!.closePath();
          ctx!.stroke();
        }
        canvasModeAnimRef.current = requestAnimationFrame(drawRippleMorph);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawRippleMorph);
    }

    /* ── KALEIDO3D: kaleidoscope storm — symmetrical morphing geometry ── */
    if (cfg.mode === 'kaleido3d') {
      const KSYM = Math.max(4, Math.round(cfg.symmetry));
      const KSPOKES = KSYM * 2;
      function drawKaleido3d() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const baseR = Math.min(W, H) * 0.47;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.05)';
        ctx!.fillRect(0, 0, W, H);
        ctx!.save();
        ctx!.translate(cx, cy);
        for (let layer = 0; layer < 5; layer++) {
          const layerPhase = (layer / 5) * Math.PI * 2 + tSec * 0.08 * speed;
          const layerR = baseR * (0.25 + layer * 0.14);
          const layerAlpha = (0.4 + 0.3 * Math.sin(tSec * 1.1 + layer)) * iF;
          for (let sym = 0; sym < KSPOKES; sym++) {
            ctx!.save();
            ctx!.rotate((sym / KSPOKES) * Math.PI * 2 + layerPhase * 0.5);
            if (sym % 2 === 1) ctx!.scale(-1, 1);
            const morphT = (tSec * 0.12 * speed + layer * 0.3) % 1;
            const petalW = layerR * (0.15 + 0.15 * Math.sin(tSec * 0.8 + layer));
            const petalH = layerR * (0.55 + 0.2 * Math.sin(tSec * 0.6 + layer * 0.7));
            const kcr = (pr + 128 * morphT) | 0;
            const kcg = (pg + 128 * (1 - morphT)) | 0;
            ctx!.strokeStyle = `rgba(${kcr},${kcg},${pb},${layerAlpha})`;
            ctx!.lineWidth = 1.2;
            ctx!.beginPath();
            ctx!.moveTo(0, 0);
            ctx!.bezierCurveTo(petalW * 1.5, petalH * 0.3, petalW * 0.8, petalH * 0.75, 0, petalH);
            ctx!.bezierCurveTo(-petalW * 0.8, petalH * 0.75, -petalW * 1.5, petalH * 0.3, 0, 0);
            ctx!.stroke();
            const nodeY = petalH * 0.42;
            const nodeR2 = petalW * 0.4;
            const kng = ctx!.createRadialGradient(0, nodeY, 0, 0, nodeY, nodeR2 * 3);
            kng.addColorStop(0, `rgba(${pr},${pg},${pb},${layerAlpha * 1.5})`);
            kng.addColorStop(1, 'rgba(0,0,0,0)');
            ctx!.fillStyle = kng;
            ctx!.beginPath();
            ctx!.arc(0, nodeY, nodeR2 * 3, 0, Math.PI * 2);
            ctx!.fill();
            ctx!.restore();
          }
        }
        ctx!.restore();
        canvasModeAnimRef.current = requestAnimationFrame(drawKaleido3d);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawKaleido3d);
    }

    /* ── MIRRORTUNNEL: neon-framed infinite mirror tunnel ── */
    if (cfg.mode === 'mirrortunnel') {
      const NUM_FRAMES = Math.max(12, Math.round(cfg.complexity * 1.2));
      function drawMirrorTunnel() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.12)';
        ctx!.fillRect(0, 0, W, H);
        const maxDim = Math.max(W, H) * 0.72;
        const drift = tSec * speed * 0.18;
        for (let fi = 0; fi < NUM_FRAMES; fi++) {
          // Frames shrink toward the center — nearest frame is largest
          const frac = ((fi + drift) % NUM_FRAMES) / NUM_FRAMES;
          const scale = (1 - frac) ** 1.4; // perspective compression
          if (scale < 0.01) continue;
          const w2 = maxDim * scale;
          const h2 = w2 * (H / W);
          const rot = frac * Math.PI * 0.18 * (cfg.symmetry / 5);
          const alpha = scale * iF * 0.9;
          // Color cycles along hue
          const hueT = (fi / NUM_FRAMES + tSec * 0.04 * speed) % 1;
          const cr = (pr + (255 - pr) * Math.abs(Math.sin(hueT * Math.PI))) | 0;
          const cg = (pg + (200 - pg) * Math.abs(Math.sin((hueT + 0.33) * Math.PI))) | 0;
          const cb = (pb + (255 - pb) * Math.abs(Math.sin((hueT + 0.67) * Math.PI))) | 0;
          const glow = ctx!.createLinearGradient(cx - w2, cy - h2, cx + w2, cy + h2);
          glow.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha * 0.7})`);
          glow.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha})`);
          glow.addColorStop(1, `rgba(${cr},${cg},${cb},${alpha * 0.7})`);
          ctx!.save();
          ctx!.translate(cx, cy);
          ctx!.rotate(rot);
          ctx!.strokeStyle = glow;
          ctx!.lineWidth = (1.5 + scale * 2) * (cfg.glow / 8);
          ctx!.shadowColor = `rgba(${cr},${cg},${cb},${alpha * 0.8})`;
          ctx!.shadowBlur = scale * 18 * (cfg.glow / 8);
          ctx!.strokeRect(-w2, -h2, w2 * 2, h2 * 2);
          ctx!.shadowBlur = 0;
          // Corner sparks
          if (scale > 0.15) {
            const corners = [
              [-w2, -h2],
              [w2, -h2],
              [w2, h2],
              [-w2, h2],
            ];
            for (const [cx2, cy2] of corners) {
              const sg = ctx!.createRadialGradient(cx2, cy2, 0, cx2, cy2, scale * 14);
              sg.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
              sg.addColorStop(1, 'rgba(0,0,0,0)');
              ctx!.fillStyle = sg;
              ctx!.beginPath();
              ctx!.arc(cx2, cy2, scale * 14, 0, Math.PI * 2);
              ctx!.fill();
            }
          }
          ctx!.restore();
        }
        canvasModeAnimRef.current = requestAnimationFrame(drawMirrorTunnel);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawMirrorTunnel);
    }

    /* ── INFINITEDIVE: perspective rings of nested polygons diving inward ── */
    if (cfg.mode === 'infinitedive') {
      const SIDES = Math.max(3, Math.round(cfg.symmetry));
      const NUM_POLYS = Math.max(10, Math.round(cfg.complexity * 1.3));
      function drawInfiniteDive() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.1)';
        ctx!.fillRect(0, 0, W, H);
        const maxR = Math.min(W, H) * 0.5;
        const drift = tSec * speed * 0.22;
        for (let pi = 0; pi < NUM_POLYS; pi++) {
          const frac = ((pi + drift) % NUM_POLYS) / NUM_POLYS;
          const r = maxR * (1 - frac) ** 1.6;
          if (r < 2) continue;
          const rot = frac * Math.PI * 2 * (1 / SIDES) + tSec * 0.08 * speed;
          const alpha = (1 - frac) * iF * 0.85;
          const hueT = (pi / NUM_POLYS + tSec * 0.03 * speed) % 1;
          const cr = (pr + (220 - pr) * Math.sin(hueT * Math.PI)) | 0;
          const cg = (pg + (180 - pg) * Math.sin((hueT + 0.4) * Math.PI)) | 0;
          const cb = (pb + (255 - pb) * Math.sin((hueT + 0.7) * Math.PI)) | 0;
          ctx!.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx!.lineWidth = (0.8 + (1 - frac) * 2.5) * (cfg.glow / 7);
          ctx!.beginPath();
          for (let s = 0; s <= SIDES; s++) {
            const a = (s / SIDES) * Math.PI * 2 + rot;
            const px = cx + r * Math.cos(a),
              py = cy + r * Math.sin(a);
            s === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
          }
          ctx!.closePath();
          ctx!.stroke();
        }
        canvasModeAnimRef.current = requestAnimationFrame(drawInfiniteDive);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawInfiniteDive);
    }

    /* ── HEARTWAVE: parametric heart curve, pulsing and breathing ── */
    if (cfg.mode === 'heartwave') {
      const N_HEARTS = Math.max(1, Math.round(cfg.complexity / 3));
      function drawHeartWave() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const baseR = Math.min(W, H) * 0.32;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.05)';
        ctx!.fillRect(0, 0, W, H);
        const pulse = 0.88 + 0.12 * Math.sin(tSec * speed * 2.2);
        for (let hi = 0; hi < N_HEARTS; hi++) {
          const orbitA = hi === 0 ? 0 : (hi / N_HEARTS) * Math.PI * 2 + tSec * speed * 0.2;
          const orbitR = hi === 0 ? 0 : baseR * 0.55;
          const hcx = cx + orbitR * Math.cos(orbitA);
          const hcy = cy + orbitR * Math.sin(orbitA);
          const scale = (hi === 0 ? baseR : baseR * 0.45) * pulse;
          const phase = (hi / Math.max(1, N_HEARTS)) * Math.PI * 2;
          ctx!.beginPath();
          const NP = 200;
          for (let n = 0; n <= NP; n++) {
            const t2 = (n / NP) * Math.PI * 2;
            // Parametric heart: x=16sin³t, y=13cost-5cos2t-2cos3t-cos4t
            const hx = 16 * Math.sin(t2) ** 3;
            const hy = -(
              13 * Math.cos(t2) -
              5 * Math.cos(2 * t2) -
              2 * Math.cos(3 * t2) -
              Math.cos(4 * t2)
            );
            const norm = scale / 17;
            const rotAngle = phase + tSec * speed * 0.08;
            const rx = hx * Math.cos(rotAngle) - hy * Math.sin(rotAngle);
            const ry = hx * Math.sin(rotAngle) + hy * Math.cos(rotAngle);
            n === 0
              ? ctx!.moveTo(hcx + rx * norm, hcy + ry * norm)
              : ctx!.lineTo(hcx + rx * norm, hcy + ry * norm);
          }
          const hue = (hi / Math.max(1, N_HEARTS) + tSec * 0.015 * speed) % 1;
          const cr = (pr + (255 - pr) * (0.5 + 0.5 * Math.sin(hue * Math.PI * 2))) | 0;
          const cg = (pg * (0.3 + 0.2 * Math.sin(hue * Math.PI * 2 + 1))) | 0;
          const cb2 = (pb + (160 - pb) * (0.3 + 0.3 * Math.sin(hue * Math.PI * 2 + 2))) | 0;
          ctx!.strokeStyle = `rgba(${cr},${cg},${cb2},${0.8 * iF})`;
          ctx!.lineWidth = 2.2;
          ctx!.stroke();
          // Fill with soft glow
          const heartGrad = ctx!.createRadialGradient(
            hcx,
            hcy - scale * 0.2,
            0,
            hcx,
            hcy,
            scale * 0.9,
          );
          heartGrad.addColorStop(0, `rgba(${cr},${cg},${cb2},${0.12 * iF})`);
          heartGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx!.fillStyle = heartGrad;
          ctx!.fill();
        }
        canvasModeAnimRef.current = requestAnimationFrame(drawHeartWave);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawHeartWave);
    }

    /* ── HEARTDANCE: multiple hearts orbiting in formation ── */
    if (cfg.mode === 'heartdance') {
      const N_HDANCERS = Math.max(2, Math.round(cfg.symmetry));
      function drawHeartDance() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const baseR = Math.min(W, H) * 0.38;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.04)';
        ctx!.fillRect(0, 0, W, H);
        // Central big heart (slowly breathing)
        const centerPulse = 0.82 + 0.18 * Math.sin(tSec * speed * 1.8);
        const centerScale = baseR * 0.42 * centerPulse;
        // Orbiting small hearts
        for (let hi = 0; hi < N_HDANCERS; hi++) {
          const isCenter = hi === 0 && N_HDANCERS === 1;
          const orbitA = (hi / N_HDANCERS) * Math.PI * 2 + tSec * speed * 0.25;
          const orbitR = baseR * 0.58;
          const hcx = isCenter ? cx : cx + orbitR * Math.cos(orbitA);
          const hcy = isCenter ? cy : cy + orbitR * Math.sin(orbitA);
          const localPulse = 0.88 + 0.12 * Math.sin(tSec * speed * 2.4 + hi * 1.3);
          const scale = (isCenter ? centerScale : baseR * 0.28) * localPulse;
          const rotAngle = orbitA + Math.PI / 2;
          ctx!.beginPath();
          const NP2 = 180;
          for (let n = 0; n <= NP2; n++) {
            const t2 = (n / NP2) * Math.PI * 2;
            const hx = 16 * Math.sin(t2) ** 3;
            const hy = -(
              13 * Math.cos(t2) -
              5 * Math.cos(2 * t2) -
              2 * Math.cos(3 * t2) -
              Math.cos(4 * t2)
            );
            const norm = scale / 17;
            const rx = hx * Math.cos(rotAngle) - hy * Math.sin(rotAngle);
            const ry = hx * Math.sin(rotAngle) + hy * Math.cos(rotAngle);
            n === 0
              ? ctx!.moveTo(hcx + rx * norm, hcy + ry * norm)
              : ctx!.lineTo(hcx + rx * norm, hcy + ry * norm);
          }
          const hue = (hi / N_HDANCERS + tSec * 0.02 * speed) % 1;
          const cr = (210 + 45 * Math.sin(hue * Math.PI * 2)) | 0;
          const cg = (pg * 0.35) | 0;
          const cb2 = (pb + 80 * Math.sin(hue * Math.PI)) | 0;
          ctx!.strokeStyle = `rgba(${cr},${cg},${cb2},${0.85 * iF})`;
          ctx!.lineWidth = isCenter ? 2.5 : 1.8;
          ctx!.stroke();
          const hg = ctx!.createRadialGradient(hcx, hcy, 0, hcx, hcy, scale * 0.8);
          hg.addColorStop(0, `rgba(${cr},${cg},${cb2},${0.15 * iF})`);
          hg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx!.fillStyle = hg;
          ctx!.fill();
          // Connecting thread to center
          if (!isCenter && N_HDANCERS > 1) {
            ctx!.strokeStyle = `rgba(${cr},${cg},${cb2},${0.15 * iF})`;
            ctx!.lineWidth = 0.6;
            ctx!.setLineDash([3, 5]);
            ctx!.beginPath();
            ctx!.moveTo(cx, cy);
            ctx!.lineTo(hcx, hcy);
            ctx!.stroke();
            ctx!.setLineDash([]);
          }
        }
        canvasModeAnimRef.current = requestAnimationFrame(drawHeartDance);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawHeartDance);
    }

    /* ── EYEMORPH: surreal blinking eyes, dilating pupils ── */
    if (cfg.mode === 'eyemorph') {
      const N_EYES = Math.max(1, Math.round(cfg.complexity / 2.5));
      function drawEyeMorph() {
        if (!canvasModeActiveRef.current) return;
        const W = mc!.width,
          H = mc!.height;
        const cx = W / 2,
          cy = H / 2;
        const baseR = Math.min(W, H) * 0.38;
        const tSec = performance.now() * 0.001;
        ctx!.fillStyle = 'rgba(0,0,0,0.06)';
        ctx!.fillRect(0, 0, W, H);
        for (let ei = 0; ei < N_EYES; ei++) {
          const orbitA =
            ei === 0 ? Math.PI * 1.5 : (ei / N_EYES) * Math.PI * 2 + tSec * speed * 0.12;
          const orbitR = ei === 0 ? 0 : baseR * 0.6;
          const ecx = cx + orbitR * Math.cos(orbitA);
          const ecy = cy + orbitR * Math.sin(orbitA);
          const eyeW =
            (ei === 0 ? baseR * 0.52 : baseR * 0.28) * (0.9 + 0.1 * Math.sin(tSec * 0.4 + ei));
          const eyeH = eyeW * 0.45;
          // Blink cycle: eyes slowly close and open
          const blinkT = (tSec * speed * 0.35 + ei * 0.7) % 1;
          const openFrac =
            blinkT < 0.85
              ? 1
              : Math.max(0, 1 - (blinkT - 0.85) / 0.08) + Math.max(0, (blinkT - 0.93) / 0.07);
          const eyeOpenH = eyeH * openFrac;
          if (eyeOpenH < 0.5) {
            // Draw closed slit
            ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.6 * iF})`;
            ctx!.lineWidth = 1.5;
            ctx!.beginPath();
            ctx!.moveTo(ecx - eyeW, ecy);
            ctx!.lineTo(ecx + eyeW, ecy);
            ctx!.stroke();
            continue;
          }
          // Pupil dilation
          const pupilSize = eyeW * 0.28 * (0.55 + 0.45 * Math.sin(tSec * speed * 0.7 + ei * 2.1));
          // Iris
          const irisG = ctx!.createRadialGradient(ecx, ecy, 0, ecx, ecy, eyeW * 0.55);
          irisG.addColorStop(0, `rgba(${pr},${pg},${pb},${0.25 * iF})`);
          irisG.addColorStop(0.5, `rgba(${pr},${pg},${pb},${0.45 * iF})`);
          irisG.addColorStop(1, `rgba(${pr},${pg},${pb},${0.15 * iF})`);
          ctx!.save();
          ctx!.beginPath();
          ctx!.ellipse(ecx, ecy, eyeW, eyeOpenH, 0, 0, Math.PI * 2);
          ctx!.clip();
          ctx!.fillStyle = irisG;
          ctx!.fillRect(ecx - eyeW, ecy - eyeOpenH, eyeW * 2, eyeOpenH * 2);
          // Iris rings
          for (let ring = 1; ring <= 4; ring++) {
            const rr2 = eyeW * 0.55 * (ring / 4);
            ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.25 * iF})`;
            ctx!.lineWidth = 0.5;
            ctx!.beginPath();
            ctx!.arc(ecx, ecy, rr2, 0, Math.PI * 2);
            ctx!.stroke();
          }
          // Pupil
          const pupilG = ctx!.createRadialGradient(ecx, ecy, 0, ecx, ecy, pupilSize);
          pupilG.addColorStop(0, `rgba(0,0,0,0.95)`);
          pupilG.addColorStop(0.75, `rgba(0,0,0,0.85)`);
          pupilG.addColorStop(1, `rgba(0,0,0,0)`);
          ctx!.fillStyle = pupilG;
          ctx!.beginPath();
          ctx!.arc(ecx, ecy, pupilSize, 0, Math.PI * 2);
          ctx!.fill();
          // Highlight sparkle
          ctx!.fillStyle = `rgba(255,255,255,${0.7 * iF})`;
          ctx!.beginPath();
          ctx!.arc(ecx + pupilSize * 0.35, ecy - pupilSize * 0.35, pupilSize * 0.2, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
          // Eye outline (lid shape)
          ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.8 * iF})`;
          ctx!.lineWidth = 1.8;
          ctx!.beginPath();
          ctx!.moveTo(ecx - eyeW, ecy);
          ctx!.bezierCurveTo(
            ecx - eyeW * 0.6,
            ecy - eyeOpenH * 1.2,
            ecx + eyeW * 0.6,
            ecy - eyeOpenH * 1.2,
            ecx + eyeW,
            ecy,
          );
          ctx!.bezierCurveTo(
            ecx + eyeW * 0.6,
            ecy + eyeOpenH * 1.2,
            ecx - eyeW * 0.6,
            ecy + eyeOpenH * 1.2,
            ecx - eyeW,
            ecy,
          );
          ctx!.stroke();
          // Lashes (subtle)
          const N_LASHES = 8;
          for (let l = 0; l < N_LASHES; l++) {
            const la = -Math.PI + (l / N_LASHES) * Math.PI;
            const lx1 = ecx + eyeW * Math.cos(la);
            const ly1 = ecy - eyeOpenH * Math.abs(Math.sin(la)) * 1.1;
            const lx2 = lx1 + Math.cos(la + Math.PI * 0.15) * eyeW * 0.12;
            const ly2 = ly1 - eyeOpenH * 0.25;
            ctx!.strokeStyle = `rgba(${pr},${pg},${pb},${0.45 * iF})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(lx1, ly1);
            ctx!.lineTo(lx2, ly2);
            ctx!.stroke();
          }
        }
        canvasModeAnimRef.current = requestAnimationFrame(drawEyeMorph);
      }
      canvasModeAnimRef.current = requestAnimationFrame(drawEyeMorph);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(mc);
    return () => {
      canvasModeActiveRef.current = false;
      cancelAnimationFrame(canvasModeAnimRef.current);
      ro.disconnect();
      const c = mc.getContext('2d');
      if (c) c.clearRect(0, 0, mc.width, mc.height);
    };
  }, [
    cfg.mode,
    cfg.preset,
    cfg.breathSpeed,
    cfg.intensity,
    cfg.complexity,
    cfg.symmetry,
    cfg.glow,
    cfg.luminous,
  ]);

  function startJourney(id: number) {
    setJourneyId(id);
    journeyIdRef.current = id;
    journeyStartRef.current = performance.now();
    journeyRunningRef.current = true;
    setJourneyRunning(true);
    phaseInfoRef.current = { phaseIdx: 0, phaseProgress: 0 };
    setJourneyPhaseInfo({ phaseIdx: 0, phaseProgress: 0 });
  }

  function skipToPhase(phaseIdx: number) {
    if (!journeyRunning) return;
    const jData = JOURNEYS[journeyIdRef.current - 1];
    if (!jData) return;
    const totalDur = jData.stages.reduce(
      (s: number, st: { duration: number }) => s + st.duration,
      0,
    );
    let acc = 0;
    for (let i = 0; i < phaseIdx; i++) acc += jData.stages[i].duration;
    journeyStartRef.current = performance.now() - (acc % totalDur) * 1000;
    phaseInfoRef.current = { phaseIdx, phaseProgress: 0 };
    setJourneyPhaseInfo({ phaseIdx, phaseProgress: 0 });
  }

  function stopJourney() {
    journeyRunningRef.current = false;
    setJourneyRunning(false);
    if (journeyCfgRef.current) {
      setCfg(journeyCfgRef.current);
      journeyCfgRef.current = null;
    }
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    // Finger touch — click to toggle the distortion on/off at the click point.
    if (fingerDistortRef.current) {
      fingerLatchedRef.current = !fingerLatchedRef.current;
      if (fingerLatchedRef.current) {
        const r = canvasRef.current!.getBoundingClientRect();
        const { W, H } = sizeRef.current;
        _distortWorldX = e.clientX - r.left - W / 2;
        _distortWorldY = -(e.clientY - r.top - H / 2);
        _distortActive = true;
      } else {
        _distortActive = false;
      }
    }
    if (!_rippleRingsVisible || isCurrentTextureMode(cfgRef.current.mode)) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    ripplesRef.current.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      born: performance.now(),
    });
    if (ripplesRef.current.length > 10) ripplesRef.current.shift();
  }

  function setRippleRingVisibility(next: boolean) {
    _rippleRingsVisible = next;
    setRippleRingsVisible(next);
    if (!next) {
      ripplesRef.current.length = 0;
      for (const r of rippleRingsRef.current) {
        r.parent?.remove(r);
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      }
      rippleRingsRef.current = [];
    }
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const isTouchPreset = cfgRef.current.mode === 'touchpreset';
    if (!fingerDistortRef.current && !isTouchPreset && activePointerIdRef.current === null) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const { W, H } = sizeRef.current;
    _distortWorldX = e.clientX - rect.left - W / 2;
    _distortWorldY = -(e.clientY - rect.top - H / 2);
    // Touch-preset places live; finger distortion follows the click-toggle latch.
    _distortActive = isTouchPreset ? true : fingerLatchedRef.current;
    if (
      _rippleRingsVisible &&
      _distortMode === 'ripple' &&
      !isCurrentTextureMode(cfgRef.current.mode) &&
      ripplesRef.current.length < 10
    ) {
      ripplesRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        born: performance.now(),
      });
    }
  }

  function handleCanvasPointerLeave() {
    // Keep a latched finger active even when the pointer leaves the canvas.
    if (activePointerIdRef.current === null) _distortActive = fingerLatchedRef.current;
  }

  function setTouchMode(mode: FingerMode) {
    _distortMode = mode;
    fingerDistortRef.current = mode !== 'off';
    setFingerMode(mode);
    if (mode === 'off') {
      fingerLatchedRef.current = false;
      _distortActive = false;
    }
  }

  function stopVoiceAgitation() {
    cancelAnimationFrame(voiceAnimRef.current);
    voiceAnimRef.current = 0;
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
    void voiceAudioContextRef.current?.close();
    voiceAudioContextRef.current = null;
    _voiceEnergy = 0;
    setVoiceListening(false);
  }

  function stopDjInput() {
    cancelAnimationFrame(djAnimRef.current);
    djAnimRef.current = 0;
    djStreamRef.current?.getTracks().forEach((track) => track.stop());
    djStreamRef.current = null;
    void djAudioContextRef.current?.close();
    djAudioContextRef.current = null;
    _musicPulse = 0;
    _musicBass = 0;
    _musicDrums = 0;
    _musicPads = 0;
    _musicKeys = 0;
    _musicLead = 0;
    setDjListening(false);
    setDjEnergy({ level: 0, bass: 0, highs: 0 });
  }

  async function toggleDjInput() {
    setDjError('');
    if (djListening) {
      stopDjInput();
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setDjError('Audio input is not available in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const audioContext = new window.AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.78;
      audioContext.createMediaStreamSource(stream).connect(analyser);

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      let lastKick = 0;
      let levelSmooth = 0;
      let bassSmooth = 0;
      let highSmooth = 0;

      djStreamRef.current = stream;
      djAudioContextRef.current = audioContext;
      setDjListening(true);

      const bandAvg = (from: number, to: number) => {
        let sum = 0;
        let count = 0;
        for (let i = from; i <= to && i < freqData.length; i++) {
          sum += freqData[i] / 255;
          count++;
        }
        return count ? sum / count : 0;
      };

      const readDj = () => {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const centered = (timeData[i] - 128) / 128;
          sum += centered * centered;
        }

        const rms = Math.sqrt(sum / timeData.length);
        const level = Math.min(1, Math.max(0, (rms - 0.018) * 8));
        const bass = Math.min(1, bandAvg(1, 8) * 1.55);
        const mids = Math.min(1, bandAvg(9, 34) * 1.2);
        const highs = Math.min(1, bandAvg(35, 120) * 1.25);
        const kick = Math.max(0, bass - bassSmooth * 1.08);

        levelSmooth = levelSmooth * 0.82 + level * 0.18;
        bassSmooth = bassSmooth * 0.76 + bass * 0.24;
        highSmooth = highSmooth * 0.82 + highs * 0.18;

        const now = performance.now();
        const kickHit = kick > 0.11 && now - lastKick > 170;
        if (kickHit) lastKick = now;

        _musicBass = Math.max(_musicBass * 0.9, bassSmooth);
        _musicDrums = Math.max(
          _musicDrums * 0.82,
          kickHit ? Math.min(1, kick * 5.5) : level * 0.32,
        );
        _musicKeys = Math.max(_musicKeys * 0.88, mids * 0.62);
        _musicLead = Math.max(_musicLead * 0.84, highSmooth);
        _musicPads = Math.max(_musicPads * 0.9, Math.min(1, mids * 0.28 + levelSmooth * 0.24));
        _musicPulse = Math.max(
          _musicPulse * 0.82,
          Math.min(1, _musicDrums * 0.62 + bassSmooth * 0.34 + levelSmooth * 0.2),
        );

        setDjEnergy({ level: levelSmooth, bass: bassSmooth, highs: highSmooth });
        djAnimRef.current = requestAnimationFrame(readDj);
      };
      readDj();
    } catch (error) {
      setDjError(error instanceof Error ? error.message : 'Could not start DJ audio input.');
      stopDjInput();
    }
  }

  async function toggleVoiceAgitation() {
    setVoiceError('');
    if (voiceListening) {
      stopVoiceAgitation();
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Microphone input is not available in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextCtor = window.AudioContext;
      const audioContext = new AudioContextCtor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      voiceStreamRef.current = stream;
      voiceAudioContextRef.current = audioContext;
      setVoiceListening(true);

      const readVoice = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          const centered = (samples[i] - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / samples.length);
        const next = Math.min(1, Math.max(0, (rms - 0.018) * 9));
        _voiceEnergy = _voiceEnergy * 0.72 + next * 0.28;
        voiceAnimRef.current = requestAnimationFrame(readVoice);
      };
      readVoice();
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Could not start microphone input.');
      stopVoiceAgitation();
    }
  }

  function toggleFingerDistort() {
    setTouchMode(fingerMode === 'off' ? 'ripple' : 'off');
  }

  const COLOUR_PRESET_NAMES = new Set([
    'Yantra Colour',
    'Rorschach Colour',
    'Rainbow 3D',
    'Rainbow Gate',
    'Cathedral Glass',
    'Prism Bloom',
    'Solar Crown',
    'Ice Prism',
    'Neon Rain',
    'Tangka Sky',
    'Tangka Fire',
    'Aurora Globe',
    'Crystal Globe',
  ]);

  function applyPreset(name: string) {
    const p = PRESETS[name] ?? PRESETS['Calm Field'];
    setSelectedPresetName(name);
    setCfg((prev) => ({
      ...p,
      preset: COLOUR_PRESET_NAMES.has(name) ? p.preset : (p.preset ?? prev.preset),
      luminous: Math.min(1.5, p.luminous),
    }));
  }

  function handleRandomize() {
    const keys = Object.keys(PRESETS);
    const base = PRESETS[keys[Math.floor(Math.random() * keys.length)]];
    const modeKeys: Mode[] = [
      'sacred',
      'burst',
      'lissajous',
      'golden',
      'kaleidoscope',
      'torus',
      'tunnel',
      'vitral',
      'fibonacci',
      'clifford',
      'hypercube',
      'warp',
      'lorenz',
      'knot',
      'orbital',
      'geodesic',
    ];
    setCfg({
      ...base,
      symmetry: 4 + Math.floor(Math.random() * 20),
      complexity: 2 + Math.random() * 8,
      glow: 1 + Math.random() * 9,
      breathSpeed: 0.1 + Math.random() * 1.0,
      intensity: 4 + Math.random() * 6,
      particles: Math.floor(Math.random() * 10),
      luminous: Math.random() * 5,
      stars: Math.floor(Math.random() * 8),
      mode: modeKeys[Math.floor(Math.random() * modeKeys.length)],
      preset: cfgRef.current.preset,
    });
    setSelectedPresetName('Randomized');
  }

  function handleSave() {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.download = `geometry-field-${Date.now()}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  }

  function handleFullscreen() {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  function update(key: keyof Cfg, val: number | string) {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }

  const displayCfg = journeyCfgRef.current ?? cfg;
  const pal = PAL[displayCfg.preset] ?? PAL['Calm Field'];
  const [pr, pg, pb] = pal.rgb;
  const accent = `rgb(${pr},${pg},${pb})`;
  const accentFaint = `rgba(${pr},${pg},${pb},0.12)`;
  const accentMid = `rgba(${pr},${pg},${pb},0.35)`;
  const fingerDistort = fingerMode !== 'off';
  const isProjectionMode = liveMode === 'projection';
  const isControlMode = liveMode === 'control';

  const activeJourney = JOURNEYS[journeyId - 1];
  const currentStage = activeJourney?.stages[journeyPhaseInfo.phaseIdx];
  const totalJourneyDur = activeJourney?.stages.reduce((s, st) => s + st.duration, 0) ?? 0;
  const elapsed = journeyRunning
    ? activeJourney?.stages
        .slice(0, journeyPhaseInfo.phaseIdx)
        .reduce((s, st) => s + st.duration, 0) +
      journeyPhaseInfo.phaseProgress * (currentStage?.duration ?? 0)
    : 0;

  const pill = (txt: string, active: boolean, onClick: () => void, small = false) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        background: active ? accent : accentFaint,
        border: `1px solid ${active ? accent : accentMid}`,
        borderRadius: 99,
        padding: small ? '4px 10px' : '5px 13px',
        color: active ? '#fff' : accent,
        fontFamily: 'var(--font-serif)',
        fontSize: small ? 10 : 11,
        fontWeight: active ? 700 : 400,
        letterSpacing: '0.05em',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {txt}
    </button>
  );

  return (
    <div
      ref={wrapperRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: isProjectionMode ? '100svh' : 'calc(100svh - 92px)',
        minHeight: 0,
        position: isProjectionMode ? 'fixed' : undefined,
        inset: isProjectionMode ? 0 : undefined,
        zIndex: isProjectionMode ? 2147483000 : undefined,
        borderRadius: 0,
        overflow: 'hidden',
        background: '#080604',
      }}
    >
      {/* Canvas area — fills remaining space */}
      <div ref={canvasContainerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onPointerDown={(e) => {
            e.preventDefault();
            activePointerIdRef.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            handleCanvasPointerMove(e);
            const is3d =
              cfg.mode === 'celtic' ||
              cfg.mode === 'lissajous3d' ||
              cfg.mode === 'tknot3d' ||
              cfg.mode === 'lorenz3d' ||
              cfg.mode === 'rose3d' ||
              cfg.mode === 'helix3d' ||
              cfg.mode === 'orbital3d' ||
              cfg.mode === 'firework3d' ||
              cfg.mode === 'fibonacci3d' ||
              cfg.mode === 'yantra3d' ||
              cfg.mode === 'rainbow3d';
            if (!is3d) return;
            l3dDragRef.current = { lastX: e.clientX, lastY: e.clientY };
          }}
          onPointerMove={(e) => {
            handleCanvasPointerMove(e);
            const is3d =
              cfg.mode === 'celtic' ||
              cfg.mode === 'lissajous3d' ||
              cfg.mode === 'tknot3d' ||
              cfg.mode === 'lorenz3d' ||
              cfg.mode === 'rose3d' ||
              cfg.mode === 'helix3d' ||
              cfg.mode === 'orbital3d' ||
              cfg.mode === 'firework3d' ||
              cfg.mode === 'fibonacci3d' ||
              cfg.mode === 'yantra3d' ||
              cfg.mode === 'rainbow3d';
            if (!is3d || !l3dDragRef.current) return;
            const dx = e.clientX - l3dDragRef.current.lastX;
            const dy = e.clientY - l3dDragRef.current.lastY;
            l3dRotRef.current.y += dx * 0.008;
            l3dRotRef.current.x += dy * 0.008;
            l3dDragRef.current = { lastX: e.clientX, lastY: e.clientY };
          }}
          onPointerLeave={handleCanvasPointerLeave}
          onPointerUp={(e) => {
            if (activePointerIdRef.current === e.pointerId) {
              activePointerIdRef.current = null;
              // Keep it on if the finger is click-latched.
              _distortActive = fingerLatchedRef.current;
            }
            e.currentTarget.releasePointerCapture(e.pointerId);
            l3dDragRef.current = null;
          }}
          onPointerCancel={(e) => {
            if (activePointerIdRef.current === e.pointerId) {
              activePointerIdRef.current = null;
              _distortActive = fingerLatchedRef.current;
            }
            l3dDragRef.current = null;
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            touchAction: 'none',
            // Display mode (controls hidden): fill ~10% more of the screen.
            transform: open ? undefined : 'scale(1.1)',
            transformOrigin: 'center center',
            cursor:
              cfg.mode === 'celtic' ||
              cfg.mode === 'lissajous3d' ||
              cfg.mode === 'tknot3d' ||
              cfg.mode === 'lorenz3d' ||
              cfg.mode === 'rose3d' ||
              cfg.mode === 'helix3d' ||
              cfg.mode === 'orbital3d' ||
              cfg.mode === 'firework3d' ||
              cfg.mode === 'fibonacci3d' ||
              cfg.mode === 'yantra3d' ||
              cfg.mode === 'rainbow3d'
                ? 'grab'
                : 'crosshair',
          }}
        />

        {/* Canvas overlay — matrix rain, breath, stream, entropy, word modes, journey phase 5 */}
        {((journeyRunning && journeyId === 5) ||
          cfg.mode === 'matrix' ||
          cfg.mode === 'matrix3d' ||
          cfg.mode === 'breath' ||
          cfg.mode === 'stream' ||
          cfg.mode === 'entropy' ||
          cfg.mode === 'wordneon' ||
          cfg.mode === 'hopefear' ||
          cfg.mode === 'wordecho' ||
          cfg.mode === 'wordparticle' ||
          cfg.mode === 'wordweave' ||
          cfg.mode === 'eclipse' ||
          cfg.mode === 'yinyang' ||
          cfg.mode === 'volcano' ||
          cfg.mode === 'atomicexplosion' ||
          cfg.mode === 'scriptures' ||
          cfg.mode === 'scripturesjp' ||
          cfg.mode === 'touchpreset' ||
          cfg.mode === 'metamorph' ||
          cfg.mode === 'chrysalis' ||
          cfg.mode === 'chrysalisrings' ||
          cfg.mode === 'breathform' ||
          cfg.mode === 'clock3d' ||
          cfg.mode === 'atomlight' ||
          cfg.mode === 'butterfly' ||
          cfg.mode === 'orbitdance' ||
          cfg.mode === 'ripplemorph' ||
          cfg.mode === 'kaleido3d' ||
          cfg.mode === 'mirrortunnel' ||
          cfg.mode === 'heartwave' ||
          cfg.mode === 'eyemorph' ||
          cfg.mode === 'heartdance' ||
          cfg.mode === 'infinitedive' ||
          cfg.mode === 'musicdots' ||
          cfg.mode === 'musicnebula' ||
          cfg.mode === 'musiclattice') && (
          <canvas
            ref={matrixCanvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              transform: open ? undefined : 'scale(1.1)',
              transformOrigin: 'center center',
              mixBlendMode: cfg.mode === 'matrix' || cfg.mode === 'matrix3d' ? 'screen' : 'normal',
              opacity: cfg.mode === 'matrix' || cfg.mode === 'matrix3d' ? 0.85 : 1,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Page title — hidden in full-screen display (controls closed) */}
        {!isProjectionMode && open && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 0,
              right: 0,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 11,
                letterSpacing: '0.24em',
                color: `rgba(${pr},${pg},${pb},0.45)`,
                textTransform: 'uppercase',
              }}
            >
              Geometry Field
            </p>
          </div>
        )}

        {/* Journey live phase badge */}
        {journeyRunning && open && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${accentMid}`,
              borderRadius: 8,
              padding: '5px 10px',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 9,
                color: accent,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              {activeJourney?.name} — Phase {journeyPhaseInfo.phaseIdx + 1}/
              {activeJourney?.stages.length}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 9,
                color: `rgba(${pr},${pg},${pb},0.5)`,
                marginTop: 2,
              }}
            >
              {currentStage?.mode} · {Math.floor(elapsed ?? 0)}s / {Math.floor(totalJourneyDur)}s
            </div>
          </div>
        )}

        {/* Show-controls — a tiny discrete arrow, bottom-right, when the panel
        is closed (display mode), so the visual stays clean while projecting. */}
        {!open && !isProjectionMode && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="Show controls"
            aria-label="Show controls"
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(8,6,4,0.32)',
              border: `1px solid ${accentMid}`,
              borderRadius: 99,
              color: accent,
              fontSize: 11,
              lineHeight: 1,
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
              opacity: 0.45,
              zIndex: 20,
            }}
          >
            ◤
          </button>
        )}

        {!isProjectionMode && open && (
          <button
            type="button"
            onClick={handleFullscreen}
            title="Fullscreen"
            style={{
              position: 'absolute',
              right: 14,
              bottom: open ? 14 : 58,
              background: 'rgba(8,6,4,0.72)',
              border: `1px solid ${accentMid}`,
              borderRadius: 99,
              padding: '7px 12px',
              color: accent,
              fontFamily: 'var(--font-serif)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              zIndex: 21,
            }}
          >
            Full
          </button>
        )}
        {cfg.mode === 'missionsun' && (
          <div
            style={{
              position: 'absolute',
              left: 14,
              bottom: open ? 14 : 58,
              zIndex: 21,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              alignItems: 'flex-start',
            }}
          >
            <button
              type="button"
              onClick={toggleVoiceAgitation}
              title="Use microphone energy to agitate the Mission Sun dots"
              style={{
                background: voiceListening ? accentFaint : 'rgba(8,6,4,0.72)',
                border: `1px solid ${voiceListening ? accent : accentMid}`,
                borderRadius: 99,
                padding: '7px 12px',
                color: accent,
                fontFamily: 'var(--font-serif)',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                boxShadow: voiceListening ? `0 0 28px rgba(${pr},${pg},${pb},0.22)` : 'none',
              }}
            >
              {voiceListening ? 'Voice On' : 'Voice'}
            </button>
            {voiceError && (
              <span
                style={{
                  maxWidth: 220,
                  color: `rgba(${pr},${pg},${pb},0.72)`,
                  fontFamily: 'var(--font-serif)',
                  fontSize: 9,
                  lineHeight: 1.35,
                  background: 'rgba(8,6,4,0.72)',
                  border: `1px solid ${accentMid}`,
                  borderRadius: 8,
                  padding: '5px 7px',
                }}
              >
                {voiceError}
              </span>
            )}
          </div>
        )}
        {isProjectionMode && (
          <button
            type="button"
            aria-label="Exit projection mode"
            title="Exit projection"
            onClick={() => window.location.assign('/geometry-field')}
            onMouseDown={() => {
              projectionExitTimerRef.current = window.setTimeout(() => {
                window.location.assign('/geometry-field');
              }, 900);
            }}
            onMouseUp={() => window.clearTimeout(projectionExitTimerRef.current)}
            onMouseLeave={() => window.clearTimeout(projectionExitTimerRef.current)}
            onTouchStart={() => {
              projectionExitTimerRef.current = window.setTimeout(() => {
                window.location.assign('/geometry-field');
              }, 900);
            }}
            onTouchEnd={() => window.clearTimeout(projectionExitTimerRef.current)}
            onTouchCancel={() => window.clearTimeout(projectionExitTimerRef.current)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 72,
              height: 72,
              border: 0,
              background: 'transparent',
              cursor: 'default',
              zIndex: 100,
              pointerEvents: 'auto',
            }}
          />
        )}
      </div>

      {/* Control panel — fixed 50% height when open */}
      {open && !isProjectionMode && (
        <div
          style={{
            flexShrink: 0,
            height: '50%',
            background: 'rgba(8,5,3,0.94)',
            backdropFilter: 'blur(18px)',
            borderTop: `1px solid ${accentMid}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ── Sticky header: tabs + view toggle (never scrolls) ── */}
          <div
            style={{
              flexShrink: 0,
              padding: '8px 16px 6px',
              borderBottom: `1px solid rgba(${pr},${pg},${pb},0.1)`,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {/* Builder only for now (3 Oct 2026). Music Visuals, Journeys and
                    Figures are hidden, not deleted: their code is untouched, so
                    bringing a tab back is restoring its pill line. */}
                {pill('Builder', tab === 'builder', () => setTab('builder'), true)}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: accentFaint,
                  border: `1px solid ${accentMid}`,
                  borderRadius: 99,
                  padding: '3px 18px',
                  color: accent,
                  fontFamily: 'var(--font-serif)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >
                ▼
              </button>
            </div>
            {isControlMode && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 8,
                  alignItems: 'center',
                  color: `rgba(${pr},${pg},${pb},0.58)`,
                  fontFamily: 'var(--font-serif)',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <span>LAN control {liveStatus} · projection: /geometry-field?projection=1</span>
                <button
                  type="button"
                  onClick={() => window.open('/geometry-field?projection=1', '_blank')}
                  style={{
                    border: `1px solid ${accentMid}`,
                    background: accentFaint,
                    borderRadius: 99,
                    color: accent,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-serif)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    padding: '3px 9px',
                    textTransform: 'uppercase',
                  }}
                >
                  Open output
                </button>
              </div>
            )}
            {tab === 'builder' && (
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: accent,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    opacity: 0.9,
                  }}
                >
                  {MODES.find((m) => m.mode === cfg.mode)?.label ?? cfg.mode}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['programs', 'sliders'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBuilderView(v)}
                      style={{
                        background: builderView === v ? accentFaint : 'transparent',
                        border: `1px solid ${builderView === v ? accentMid : `rgba(${pr},${pg},${pb},0.15)`}`,
                        borderRadius: 99,
                        padding: '3px 10px',
                        color: builderView === v ? accent : `rgba(${pr},${pg},${pb},0.45)`,
                        fontFamily: 'var(--font-serif)',
                        fontSize: 9,
                        cursor: 'pointer',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* ── Scrollable content ── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* ── BUILDER TAB ── */}
            {tab === 'builder' && (
              <>
                {/* Programs grid */}
                {builderView === 'programs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Featured presets — numbered, 2D/3D groups */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      {(() => {
                        let n = 0;
                        let dim = false;
                        return FEATURED_PRESETS.map((item, i) => {
                          if ('header' in item) {
                            dim = item.dim ?? false;
                            return (
                              <div
                                key={`h-${i}`}
                                style={{
                                  gridColumn: '1 / -1',
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: 7,
                                  letterSpacing: '0.18em',
                                  textTransform: 'uppercase' as const,
                                  color: `rgba(${pr},${pg},${pb},${dim ? 0.22 : 0.38})`,
                                  textAlign: 'center' as const,
                                  paddingTop: 6,
                                  paddingBottom: 2,
                                }}
                              >
                                {item.header}
                              </div>
                            );
                          }
                          const { name, tag } = item;
                          const num = ++n;
                          const isActive = selectedPresetName === name;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => applyPreset(name)}
                              style={{
                                background: isActive ? accentFaint : 'transparent',
                                border: `1px solid ${isActive ? accentMid : `rgba(${pr},${pg},${pb},${dim ? 0.07 : 0.12})`}`,
                                borderRadius: 8,
                                padding: '7px 5px 6px',
                                color: isActive
                                  ? accent
                                  : `rgba(${pr},${pg},${pb},${dim ? 0.35 : 0.62})`,
                                fontFamily: 'var(--font-serif)',
                                cursor: 'pointer',
                                textAlign: 'left' as const,
                                display: 'flex',
                                flexDirection: 'row' as const,
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <span
                                style={{
                                  minWidth: 18,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  opacity: 0.72,
                                  color: accent,
                                  textAlign: 'right',
                                }}
                              >
                                {num}
                              </span>
                              <span style={{ display: 'grid', gap: 1, minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: isActive ? 700 : 400,
                                    letterSpacing: '0.04em',
                                    color: 'inherit',
                                  }}
                                >
                                  {name}
                                </span>
                                <span
                                  style={{
                                    fontSize: 7,
                                    opacity: 0.4,
                                    letterSpacing: '0.1em',
                                    color: accent,
                                  }}
                                >
                                  {tag}
                                </span>
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* All modes */}
                    <div
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 8,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: `rgba(${pr},${pg},${pb},0.45)`,
                        paddingTop: 4,
                        paddingBottom: 2,
                      }}
                    >
                      All Programs
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {MODES.map(({ mode, label }, idx) => {
                        const isActive = cfg.mode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              const p = MODE_TO_PRESET[mode];
                              if (p) applyPreset(p);
                              else update('mode', mode);
                            }}
                            style={{
                              background: isActive ? accentFaint : 'transparent',
                              border: `1px solid ${isActive ? accentMid : `rgba(${pr},${pg},${pb},0.15)`}`,
                              borderRadius: 8,
                              padding: '9px 6px 7px',
                              color: isActive ? accent : `rgba(${pr},${pg},${pb},0.6)`,
                              fontFamily: 'var(--font-serif)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.08em' }}>
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: isActive ? 700 : 400,
                                letterSpacing: '0.05em',
                              }}
                            >
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sliders + actions */}
                {builderView === 'sliders' && (
                  <>
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}
                    >
                      {slidersFor(cfg.mode).map(({ key, label, min, max, step }) => {
                        const val = (cfg[key] as number | undefined) ?? min;
                        return (
                          <div key={key}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: 9,
                                  color: `rgba(${pr},${pg},${pb},0.6)`,
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {label}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: 9,
                                  color: accent,
                                }}
                              >
                                {step < 1 ? val.toFixed(2) : Math.round(val)}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={step}
                              value={val}
                              onChange={(e) => update(key as keyof Cfg, parseFloat(e.target.value))}
                              style={{ width: '100%', accentColor: accent, cursor: 'pointer' }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {cfg.mode === 'buddhaboycurrents' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                          marginTop: 10,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 9,
                            color: `rgba(${pr},${pg},${pb},0.6)`,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Beat Move
                        </span>
                        {DANCE_MOVES.map((move) =>
                          pill(
                            move.label,
                            (cfg.danceMove ?? 'still') === move.key,
                            () => update('danceMove', move.key),
                            true,
                          ),
                        )}
                      </div>
                    )}

                    {/* Word input — shown for word modes */}
                    {(cfg.mode === 'wordneon' ||
                      cfg.mode === 'hopefear' ||
                      cfg.mode === 'wordecho' ||
                      cfg.mode === 'wordparticle' ||
                      cfg.mode === 'wordweave') && (
                      <div style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 9,
                            color: `rgba(${pr},${pg},${pb},0.6)`,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            marginBottom: 5,
                          }}
                        >
                          Your Word
                        </div>
                        <input
                          type="text"
                          value={word}
                          onChange={(e) => setWord(e.target.value.slice(0, 20))}
                          placeholder="TYPE A WORD"
                          spellCheck={false}
                          style={{
                            width: '100%',
                            background: `rgba(${pr},${pg},${pb},0.06)`,
                            border: `1px solid rgba(${pr},${pg},${pb},0.28)`,
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontFamily: 'var(--font-serif)',
                            fontSize: 16,
                            fontWeight: 700,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: accent,
                            outline: 'none',
                            textAlign: 'center',
                          }}
                        />
                      </div>
                    )}

                    {/* Finger Distortion toggle */}
                    <button
                      type="button"
                      onClick={toggleFingerDistort}
                      style={{
                        width: '100%',
                        marginBottom: 8,
                        padding: '6px 0',
                        borderRadius: 8,
                        background: fingerDistort ? `rgba(${pr},${pg},${pb},0.18)` : 'transparent',
                        border: `1px solid ${fingerDistort ? accent : `rgba(${pr},${pg},${pb},0.20)`}`,
                        color: fingerDistort ? accent : `rgba(${pr},${pg},${pb},0.55)`,
                        fontFamily: 'var(--font-serif)',
                        fontSize: 9,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {fingerDistort ? '✦ Finger Distortion ON' : '◇ Finger Distortion'}
                    </button>

                    {/* Colour bar — horizontal scrollable squares */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 3,
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        paddingBottom: 6,
                        paddingTop: 2,
                        minHeight: 30,
                      }}
                    >
                      {PAL_SORTED.map(([name, p]) => {
                        const [cr, cg, cb] = p.rgb;
                        const isActive = cfg.preset === name;
                        // Desaturate: lerp toward a warm grey so swatches aren't neon
                        const dr = Math.round(cr * 0.55 + 55 * 0.45);
                        const dg = Math.round(cg * 0.55 + 50 * 0.45);
                        const db = Math.round(cb * 0.55 + 45 * 0.45);
                        return (
                          <button
                            key={name}
                            type="button"
                            title={name}
                            onClick={() => update('preset', name)}
                            style={{
                              width: 18,
                              height: 18,
                              flexShrink: 0,
                              borderRadius: 3,
                              background: `rgb(${dr},${dg},${db})`,
                              border: isActive
                                ? `2px solid rgba(255,255,255,0.85)`
                                : '1px solid rgba(255,255,255,0.1)',
                              boxShadow: isActive
                                ? `0 0 6px 2px rgba(${dr},${dg},${db},0.7)`
                                : 'none',
                              cursor: 'pointer',
                              padding: 0,
                              outline: 'none',
                            }}
                          />
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 4,
                        marginBottom: 8,
                      }}
                    >
                      {(['off', 'ripple', 'pull', 'push', 'light'] as FingerMode[]).map((mode) => {
                        const active = fingerMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            title={`Touch ${mode}`}
                            onClick={() => setTouchMode(mode)}
                            style={{
                              minWidth: 0,
                              padding: '5px 0',
                              borderRadius: 8,
                              background: active ? `rgba(${pr},${pg},${pb},0.18)` : 'transparent',
                              border: `1px solid ${active ? accent : `rgba(${pr},${pg},${pb},0.18)`}`,
                              color: active ? accent : `rgba(${pr},${pg},${pb},0.52)`,
                              fontFamily: 'var(--font-serif)',
                              fontSize: 8,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                            }}
                          >
                            {mode}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setRippleRingVisibility(!rippleRingsVisible)}
                        style={{
                          minWidth: 0,
                          padding: '5px 0',
                          borderRadius: 8,
                          background: rippleRingsVisible
                            ? `rgba(${pr},${pg},${pb},0.18)`
                            : 'transparent',
                          border: `1px solid ${rippleRingsVisible ? accent : `rgba(${pr},${pg},${pb},0.18)`}`,
                          color: rippleRingsVisible ? accent : `rgba(${pr},${pg},${pb},0.52)`,
                          fontFamily: 'var(--font-serif)',
                          fontSize: 8,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        Rings {rippleRingsVisible ? 'On' : 'Off'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      {(['animate', 'static'] as MotionMode[]).map((mode) => {
                        const active = motionMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setMotionMode(mode)}
                            style={{
                              flex: 1,
                              padding: '6px 0',
                              borderRadius: 8,
                              background: active ? accentFaint : 'transparent',
                              border: `1px solid ${active ? accentMid : `rgba(${pr},${pg},${pb},0.18)`}`,
                              color: active ? accent : `rgba(${pr},${pg},${pb},0.55)`,
                              fontFamily: 'var(--font-serif)',
                              fontSize: 9,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                            }}
                          >
                            {mode}
                          </button>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      {(
                        [
                          ['Randomize', handleRandomize],
                          ['Save', handleSave],
                          ['Reset', () => applyPreset('Calm Field')],
                          ['Fullscreen', handleFullscreen],
                        ] as [string, () => void][]
                      ).map(([label, fn]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={fn}
                          style={{
                            background: accentFaint,
                            border: `1px solid ${accentMid}`,
                            borderRadius: 99,
                            padding: '5px 14px',
                            color: accent,
                            fontFamily: 'var(--font-serif)',
                            fontSize: 10,
                            cursor: 'pointer',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── MUSIC VISUALS TAB ── */}
            {tab === 'music' && (
              <>
                <div
                  style={{
                    border: `1px solid ${djListening ? accent : accentMid}`,
                    background: djListening ? accentFaint : `rgba(${pr},${pg},${pb},0.05)`,
                    borderRadius: 10,
                    padding: '10px 11px',
                    display: 'grid',
                    gap: 8,
                    boxShadow: djListening ? `0 0 26px rgba(${pr},${pg},${pb},0.14)` : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: accent,
                        fontWeight: 700,
                      }}
                    >
                      DJ audio input
                    </div>
                    <button
                      type="button"
                      onClick={toggleDjInput}
                      style={{
                        border: `1px solid ${djListening ? accent : accentMid}`,
                        background: djListening ? accent : 'transparent',
                        borderRadius: 99,
                        color: djListening ? '#080607' : accent,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-serif)',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        padding: '5px 11px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {djListening ? 'Input on' : 'Start input'}
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 6,
                    }}
                  >
                    {(
                      [
                        ['level', djEnergy.level],
                        ['bass', djEnergy.bass],
                        ['highs', djEnergy.highs],
                      ] as [string, number][]
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          border: `1px solid rgba(${pr},${pg},${pb},0.14)`,
                          borderRadius: 8,
                          padding: '6px 7px',
                          display: 'grid',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            color: `rgba(${pr},${pg},${pb},0.55)`,
                            fontFamily: 'var(--font-serif)',
                            fontSize: 8,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            height: 4,
                            borderRadius: 99,
                            background: `linear-gradient(90deg, ${accent} ${Math.round(value * 100)}%, rgba(${pr},${pg},${pb},0.12) 0)`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {djError && (
                    <div
                      style={{
                        color: `rgba(${pr},${pg},${pb},0.72)`,
                        fontFamily: 'var(--font-serif)',
                        fontSize: 10,
                        lineHeight: 1.35,
                      }}
                    >
                      {djError}
                    </div>
                  )}
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 11,
                    color: `rgba(${pr},${pg},${pb},0.55)`,
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                  }}
                >
                  Music visuals start here: dots, nebulas, and lattices that pulse from an internal
                  beat today, then later from Groove layers, voice recordings, microphone input, or
                  uploaded audio.
                </p>
                <div style={{ display: 'grid', gap: 7 }}>
                  {[
                    [
                      'Current Scales',
                      'Main deep music surface: dots, wings, shape morphs, and touch.',
                    ],
                    ['Sacred Sin Morph', 'Smooth sacred 3D morph for slow musical breathing.'],
                    ['Sin Morph', 'Organic 3D wave body for musical rise and release.'],
                    ['Chaos Sin Morph', 'Sharper sin morph for chaotic peaks and heavy sections.'],
                    ['Sacred Pyramid', 'Pyramid light structure for ceremonial pulse and focus.'],
                    ['Focus Arc', 'Arc-based self-map geometry for quiet musical focus.'],
                    [
                      'Drift Field',
                      'Floating node field for spacious pads and evolving structure.',
                    ],
                    [
                      'Starflow Galaxy',
                      'Spiral star instrument for gravity, arms, haze, and touch.',
                    ],
                    [
                      'Music Entropy',
                      'Dot cloud with pulse rings. Best base for analyser-driven particles.',
                    ],
                    ['Music Nebula', 'Soft galaxy haze for pads, voice, and ambient recordings.'],
                    ['Groove Lattice', 'Tiles and cyclones for drums, bass, and sequencer layers.'],
                    ['Dot Galaxy', 'Particle galaxy ready for bass and star-density mapping.'],
                  ].map(([name, desc], index) => {
                    const isActive = selectedPresetName === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          applyPreset(name);
                          if (
                            name === 'Current Scales' ||
                            name === 'Starflow Galaxy' ||
                            name === 'Drift Field'
                          )
                            setTouchMode('ripple');
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '9px 10px',
                          borderRadius: 8,
                          background: isActive ? accentFaint : 'transparent',
                          border: `1.5px solid ${isActive ? accent : 'rgba(255,255,255,0.05)'}`,
                          boxShadow: isActive
                            ? `0 0 0 1px ${accentMid}, 0 0 16px ${accentFaint}`
                            : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 9,
                            color: isActive ? accent : `rgba(${pr},${pg},${pb},0.38)`,
                            letterSpacing: '0.12em',
                            marginBottom: 3,
                          }}
                        >
                          {String(index + 1).padStart(2, '0')}
                          {isActive ? '  SELECTED' : ''}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 12,
                            color: isActive ? accent : `rgba(${pr},${pg},${pb},0.7)`,
                            fontWeight: isActive ? 700 : 500,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {name}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 10,
                            color: `rgba(${pr},${pg},${pb},0.45)`,
                            lineHeight: 1.35,
                            marginTop: 3,
                          }}
                        >
                          {desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {cfg.mode === 'currentscales' && (
                  <div
                    style={{
                      border: `1px solid ${accentMid}`,
                      background: `rgba(${pr},${pg},${pb},0.05)`,
                      borderRadius: 10,
                      padding: '10px 11px',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: accent,
                        fontWeight: 700,
                      }}
                    >
                      Current Scales response
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 6,
                      }}
                    >
                      {(
                        [
                          [
                            'Soft Tide',
                            {
                              pulse: 0.42,
                              movement: 0.28,
                              flow: 0.58,
                              colour: 0.08,
                              geometry: 0.22,
                              wings: 0.16,
                            },
                            { complexity: 6, glow: 5, particles: 5, breathSpeed: 0.62 },
                            'scales',
                          ],
                          [
                            'Bass Wings',
                            {
                              pulse: 0.78,
                              movement: 0.92,
                              flow: 0.58,
                              colour: 0.22,
                              geometry: 0.72,
                              wings: 0.92,
                            },
                            { complexity: 7, glow: 6, particles: 6, breathSpeed: 0.78 },
                            'rings',
                          ],
                          [
                            'Liquid Hands',
                            {
                              pulse: 0.62,
                              movement: 0.74,
                              flow: 0.95,
                              colour: 0.18,
                              geometry: 0.48,
                              wings: 0.36,
                            },
                            { complexity: 8, glow: 6, particles: 7, breathSpeed: 0.7 },
                            'brain',
                          ],
                          [
                            'Spark Geometry',
                            {
                              pulse: 0.92,
                              movement: 0.58,
                              flow: 0.42,
                              colour: 0.58,
                              geometry: 0.96,
                              wings: 0.54,
                            },
                            { complexity: 9, glow: 8, particles: 6, breathSpeed: 0.88 },
                            'losange',
                          ],
                        ] as [
                          string,
                          typeof currentScaleResponse,
                          Partial<Pick<Cfg, 'complexity' | 'glow' | 'particles' | 'breathSpeed'>>,
                          string,
                        ][]
                      ).map(([label, response, visual, shape]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setCurrentScaleResponse(response);
                            setCurrentScaleShape(shape);
                            setTouchMode(
                              label === 'Liquid Hands'
                                ? 'ripple'
                                : fingerMode === 'off'
                                  ? 'ripple'
                                  : fingerMode,
                            );
                            setCfg((prev) => ({ ...prev, ...visual }));
                          }}
                          style={{
                            borderRadius: 8,
                            border: `1px solid ${accentMid}`,
                            background: `rgba(${pr},${pg},${pb},0.07)`,
                            color: accent,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-serif)',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            padding: '7px 6px',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                        gap: 5,
                      }}
                    >
                      {(
                        [
                          ['scales', 'Scales'],
                          ['rings', 'Rings'],
                          ['brain', 'Brain'],
                          ['heart', 'Heart'],
                          ['losange', 'Losange'],
                        ] as [string, string][]
                      ).map(([shape, label]) => {
                        const active = currentScaleShape === shape;
                        return (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => {
                              setCurrentScaleShape(shape);
                              if (shape !== 'scales') {
                                setCurrentScaleResponse((prev) => ({
                                  ...prev,
                                  geometry: Math.max(prev.geometry, 0.72),
                                }));
                              }
                            }}
                            style={{
                              minWidth: 0,
                              borderRadius: 8,
                              border: `1px solid ${active ? accent : `rgba(${pr},${pg},${pb},0.15)`}`,
                              background: active ? accentFaint : 'transparent',
                              color: active ? accent : `rgba(${pr},${pg},${pb},0.48)`,
                              cursor: 'pointer',
                              fontFamily: 'var(--font-serif)',
                              fontSize: 8,
                              fontWeight: active ? 700 : 500,
                              letterSpacing: '0.04em',
                              padding: '6px 0',
                              textTransform: 'uppercase',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {(
                      [
                        ['pulse', 'dot pulse'],
                        ['movement', 'dot movement'],
                        ['flow', 'flow swirl'],
                        ['colour', 'beat colour'],
                        ['geometry', 'cell geometry'],
                        ['wings', 'wings'],
                      ] as [keyof typeof currentScaleResponse, string][]
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '82px 1fr 28px',
                          alignItems: 'center',
                          gap: 7,
                          color: `rgba(${pr},${pg},${pb},0.62)`,
                          fontFamily: 'var(--font-serif)',
                          fontSize: 10,
                        }}
                      >
                        <span>{label}</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={currentScaleResponse[key]}
                          onChange={(event) => {
                            const value = Number(event.currentTarget.value);
                            setCurrentScaleResponse((prev) => ({
                              ...prev,
                              [key]: value,
                            }));
                          }}
                          style={{ width: '100%', accentColor: accent }}
                        />
                        <span style={{ textAlign: 'right', color: accent }}>
                          {Math.round(currentScaleResponse[key] * 100)}
                        </span>
                      </label>
                    ))}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 5,
                        paddingTop: 2,
                      }}
                    >
                      {(['ripple', 'push', 'pull', 'light', 'off'] as FingerMode[]).map((mode) => {
                        const active = fingerMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setTouchMode(mode)}
                            style={{
                              minWidth: 0,
                              borderRadius: 8,
                              border: `1px solid ${active ? accent : `rgba(${pr},${pg},${pb},0.15)`}`,
                              background: active ? accentFaint : 'transparent',
                              color: active ? accent : `rgba(${pr},${pg},${pb},0.48)`,
                              fontFamily: 'var(--font-serif)',
                              fontSize: 8,
                              letterSpacing: '0.06em',
                              padding: '5px 0',
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                            }}
                          >
                            {mode}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setRippleRingVisibility(!rippleRingsVisible)}
                        style={{
                          minWidth: 0,
                          borderRadius: 8,
                          border: `1px solid ${rippleRingsVisible ? accent : `rgba(${pr},${pg},${pb},0.15)`}`,
                          background: rippleRingsVisible ? accentFaint : 'transparent',
                          color: rippleRingsVisible ? accent : `rgba(${pr},${pg},${pb},0.48)`,
                          fontFamily: 'var(--font-serif)',
                          fontSize: 8,
                          letterSpacing: '0.06em',
                          padding: '5px 0',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        Rings {rippleRingsVisible ? 'On' : 'Off'}
                      </button>
                    </div>
                  </div>
                )}
                {cfg.mode === 'nebula' && cfg.complexity >= 9 && (
                  <div
                    style={{
                      border: `1px solid ${accentMid}`,
                      background: `rgba(${pr},${pg},${pb},0.05)`,
                      borderRadius: 10,
                      padding: '10px 11px',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: accent,
                        fontWeight: 700,
                      }}
                    >
                      Starflow Galaxy response
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 6,
                      }}
                    >
                      {(
                        [
                          [
                            'Cosmic Drift',
                            {
                              impact: 0.38,
                              gravity: 0.46,
                              arms: 0.54,
                              haze: 0.78,
                              sparks: 0.22,
                              depth: 0.28,
                            },
                            'galaxy',
                          ],
                          [
                            'Spiral Drive',
                            {
                              impact: 0.72,
                              gravity: 0.86,
                              arms: 0.92,
                              haze: 0.42,
                              sparks: 0.48,
                              depth: 0.52,
                            },
                            'vortex',
                          ],
                          [
                            'Star Tunnel',
                            {
                              impact: 0.58,
                              gravity: 0.72,
                              arms: 0.68,
                              haze: 0.58,
                              sparks: 0.42,
                              depth: 0.92,
                            },
                            'tunnel',
                          ],
                          [
                            'Comet Hands',
                            {
                              impact: 0.82,
                              gravity: 0.52,
                              arms: 0.74,
                              haze: 0.36,
                              sparks: 0.92,
                              depth: 0.48,
                            },
                            'double',
                          ],
                        ] as [string, typeof galaxyResponse, string][]
                      ).map(([label, response, shape]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setGalaxyResponse(response);
                            setGalaxyShape(shape);
                            setTouchMode(fingerMode === 'off' ? 'ripple' : fingerMode);
                          }}
                          style={{
                            borderRadius: 8,
                            border: `1px solid ${accentMid}`,
                            background: `rgba(${pr},${pg},${pb},0.07)`,
                            color: accent,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-serif)',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            padding: '7px 6px',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                        gap: 5,
                      }}
                    >
                      {(
                        [
                          ['galaxy', 'Galaxy'],
                          ['vortex', 'Vortex'],
                          ['eye', 'Eye'],
                          ['tunnel', 'Tunnel'],
                          ['double', 'Double'],
                        ] as [string, string][]
                      ).map(([shape, label]) => {
                        const active = galaxyShape === shape;
                        return (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => setGalaxyShape(shape)}
                            style={{
                              minWidth: 0,
                              borderRadius: 8,
                              border: `1px solid ${active ? accent : `rgba(${pr},${pg},${pb},0.15)`}`,
                              background: active ? accentFaint : 'transparent',
                              color: active ? accent : `rgba(${pr},${pg},${pb},0.48)`,
                              cursor: 'pointer',
                              fontFamily: 'var(--font-serif)',
                              fontSize: 8,
                              fontWeight: active ? 700 : 500,
                              padding: '6px 0',
                              textTransform: 'uppercase',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {(
                      [
                        ['impact', 'impact'],
                        ['gravity', 'gravity'],
                        ['arms', 'arms'],
                        ['haze', 'haze'],
                        ['sparks', 'sparks'],
                        ['depth', 'depth'],
                      ] as [keyof typeof galaxyResponse, string][]
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '70px 1fr 28px',
                          alignItems: 'center',
                          gap: 7,
                          color: `rgba(${pr},${pg},${pb},0.62)`,
                          fontFamily: 'var(--font-serif)',
                          fontSize: 10,
                        }}
                      >
                        <span>{label}</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={galaxyResponse[key]}
                          onChange={(event) => {
                            const value = Number(event.currentTarget.value);
                            setGalaxyResponse((prev) => ({ ...prev, [key]: value }));
                          }}
                          style={{ width: '100%', accentColor: accent }}
                        />
                        <span style={{ textAlign: 'right', color: accent }}>
                          {Math.round(galaxyResponse[key] * 100)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.localStorage.setItem('colourmap:soundlab-tab', 'groove');
                      } catch {}
                      window.location.assign('/music');
                    }}
                    style={{
                      background: accent,
                      border: `1px solid ${accent}`,
                      borderRadius: 99,
                      padding: '8px 16px',
                      color: '#080607',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Open Groove Machine
                  </button>
                  <button
                    type="button"
                    onClick={handleFullscreen}
                    style={{
                      background: accentFaint,
                      border: `1px solid ${accentMid}`,
                      borderRadius: 99,
                      padding: '8px 16px',
                      color: accent,
                      fontFamily: 'var(--font-serif)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Fullscreen
                  </button>
                </div>
              </>
            )}

            {tab === 'journey' && (
              <>
                {/* Journey selection */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {JOURNEYS.map((j) =>
                    pill(`${j.icon} ${j.name}`, journeyId === j.id, () => {
                      setJourneyId(j.id);
                      journeyIdRef.current = j.id;
                      if (journeyRunning) {
                        journeyStartRef.current = performance.now();
                        phaseInfoRef.current = { phaseIdx: 0, phaseProgress: 0 };
                      }
                    }),
                  )}
                </div>

                {/* Journey description */}
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 11,
                    color: `rgba(${pr},${pg},${pb},0.55)`,
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                  }}
                >
                  {activeJourney?.desc}
                </p>

                {/* Phase list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 9,
                      color: `rgba(${pr},${pg},${pb},0.4)`,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    Phases — {Math.floor(totalJourneyDur / 60)}m{Math.round(totalJourneyDur % 60)}s
                    total
                  </div>
                  {activeJourney?.stages.map((stage, i) => {
                    const isActive = journeyRunning && journeyPhaseInfo.phaseIdx === i;
                    const prog = isActive ? journeyPhaseInfo.phaseProgress : 0;
                    return (
                      <div
                        key={i}
                        onClick={() => journeyRunning && skipToPhase(i)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '5px 8px',
                          borderRadius: 6,
                          background: isActive ? accentFaint : 'transparent',
                          border: `1px solid ${isActive ? accentMid : 'rgba(255,255,255,0.05)'}`,
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: journeyRunning ? 'pointer' : 'default',
                        }}
                      >
                        {isActive && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${prog * 100}%`,
                              background: `rgba(${pr},${pg},${pb},0.08)`,
                              transition: 'width 0.5s linear',
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 12,
                            color: accent,
                            opacity: 0.7,
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 10,
                            color: isActive
                              ? `rgb(${pr},${pg},${pb})`
                              : `rgba(${pr},${pg},${pb},0.5)`,
                            flex: 1,
                            textTransform: 'capitalize',
                          }}
                        >
                          {stage.mode} · {stage.preset}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 9,
                            color: `rgba(${pr},${pg},${pb},0.35)`,
                            flexShrink: 0,
                          }}
                        >
                          {stage.duration}s
                        </span>
                        {isActive && <span style={{ fontSize: 8, color: accent }}>▶</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Play / Stop */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                  {!journeyRunning ? (
                    <button
                      type="button"
                      onClick={() => startJourney(journeyId)}
                      style={{
                        background: accent,
                        border: 'none',
                        borderRadius: 99,
                        padding: '8px 32px',
                        color: '#000',
                        fontFamily: 'var(--font-serif)',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        cursor: 'pointer',
                      }}
                    >
                      ▶ Start Journey
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={stopJourney}
                        style={{
                          background: accentFaint,
                          border: `1px solid ${accentMid}`,
                          borderRadius: 99,
                          padding: '8px 20px',
                          color: accent,
                          fontFamily: 'var(--font-serif)',
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          cursor: 'pointer',
                        }}
                      >
                        ◼ Stop
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const jData = JOURNEYS[journeyIdRef.current - 1];
                          if (!jData) return;
                          const next = (journeyPhaseInfo.phaseIdx + 1) % jData.stages.length;
                          skipToPhase(next);
                        }}
                        style={{
                          background: accent,
                          border: 'none',
                          borderRadius: 99,
                          padding: '8px 20px',
                          color: '#000',
                          fontFamily: 'var(--font-serif)',
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          cursor: 'pointer',
                        }}
                      >
                        ▶▶ Next
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleFullscreen}
                    style={{
                      background: accentFaint,
                      border: `1px solid ${accentMid}`,
                      borderRadius: 99,
                      padding: '8px 16px',
                      color: accent,
                      fontFamily: 'var(--font-serif)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Fullscreen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
