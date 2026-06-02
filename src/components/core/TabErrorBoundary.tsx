import { Component,type ReactNode } from "react";

/**
 * Error boundary per tab (TODO #17a).
 *
 * Catches render errors inside any tab content and shows a dense one-liner
 * "tab `<name>` crashed: <message> — [retry]".  Wraps every tab entry in
 * App.tsx.
 *
 * The [retry] button forces a re-render by flipping `hasErrored` off/on,
 * which gives the child components a chance to recover (e.g. if the CLI
 * briefly became unreachable).
 */

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  hasErrored: boolean;
}

export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, hasErrored: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasErrored: true };
  }

  render(): ReactNode {
    if (!this.state.hasErrored) {
      return this.props.children;
    }

    return (
      <div className="flex items-center gap-3 text-xs p-3 border border-danger/40 bg-danger/5 rounded">
        <span className="text-danger font-bold">{this.props.name}</span>
        <span className="text-dim">crashed:</span>
        <span className="text-text truncate max-w-md">
          {this.state.error?.message ?? "unknown error"}
        </span>
        <button
          onClick={() => this.setState({ error: null, hasErrored: false })}
          className="ml-auto text-info border border-info/40 rounded px-2 py-0.5 hover:bg-info/10 transition-colors"
        >
          retry
        </button>
      </div>
    );
  }
}
