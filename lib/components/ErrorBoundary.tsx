"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof console !== "undefined") {
      console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]:`, error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="rounded-md border border-rose-400/20 bg-rose-500/8 px-4 py-4 text-center">
          <p className="type-kicker text-rose-200">Section error</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            {this.props.label ? `${this.props.label} could not render.` : "This section could not render."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            The rest of the page is unaffected.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
