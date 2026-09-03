"use client";

import React, { useEffect, useRef, useState } from "react";
import { deriveIdenticonParams } from "../../lib/identicon/hashEngine";
import { IdenticonShaderInstance, type ShaderMode } from "../../lib/identicon/shaderEngine";
import { SVGIdenticonGeometry } from "../../lib/identicon/svgGeometry";

export interface ParametricIdenticonProps {
  /** Input seed (wallet address, commit SHA, agent ID, tenant UUID, IBAN) */
  seed: string;
  /** Primary use case / shader mode */
  useCase?: ShaderMode;
  /** Size in pixels (width & height) */
  size?: number;
  /** Interactive hover acceleration */
  interactive?: boolean;
  /** State parameter for AI agent mode (0=idle, 0.5=executing, 1=thinking) */
  stateValue?: number;
  /** Optional custom CSS class name */
  className?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Title for accessibility */
  title?: string;
}

export function ParametricIdenticon({
  seed,
  useCase = "reportSeal",
  size = 128,
  interactive = true,
  stateValue = 0.5,
  className = "",
  onClick,
  title,
}: ParametricIdenticonProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shaderRef = useRef<IdenticonShaderInstance | null>(null);
  const [params, setParams] = useState(() => deriveIdenticonParams(seed));
  const [_isHovered, setIsHovered] = useState(false);

  // Update parameters when seed changes
  useEffect(() => {
    const derived = deriveIdenticonParams(seed);
    setParams(derived);
    if (shaderRef.current) {
      shaderRef.current.updateParams(derived);
    }
  }, [seed]);

  // Update shader mode when useCase prop changes
  useEffect(() => {
    if (shaderRef.current) {
      shaderRef.current.setMode(useCase);
    }
  }, [useCase]);

  // Update state value uniform when stateValue prop changes
  useEffect(() => {
    if (shaderRef.current) {
      shaderRef.current.setStateValue(stateValue);
    }
  }, [stateValue]);

  // Initialize WebGL shader engine on canvas mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set high-DPI canvas resolution
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const instance = new IdenticonShaderInstance(canvas, params, useCase);
    instance.setStateValue(stateValue);
    shaderRef.current = instance;

    return () => {
      instance.destroy();
      shaderRef.current = null;
    };
  }, [size, params, useCase, stateValue]);

  // Handle hover interactions
  const handleMouseEnter = () => {
    if (!interactive) return;
    setIsHovered(true);
    if (shaderRef.current) {
      shaderRef.current.setHover(true);
    }
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setIsHovered(false);
    if (shaderRef.current) {
      shaderRef.current.setHover(false);
    }
  };

  const accessibleLabel = title || `Parametric Identicon for ${seed}`;

  if (interactive) {
    return (
      <button
        type="button"
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950/80 shadow-lg ring-1 ring-slate-800 transition-[transform,box-shadow,ring-color] duration-300 cursor-pointer hover:scale-[1.03] hover:ring-cyan-500/50 hover:shadow-cyan-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${className}`}
        style={{ width: size, height: size }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        aria-label={accessibleLabel}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ width: size, height: size }}
        />
        <SVGIdenticonGeometry params={params} size={size} useCase={useCase} />
      </button>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950/80 shadow-lg ring-1 ring-slate-800 ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="sr-only">{accessibleLabel}</span>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ width: size, height: size }}
      />
      <SVGIdenticonGeometry params={params} size={size} useCase={useCase} />
    </div>
  );
}
