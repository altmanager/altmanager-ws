/**
 * Provides a strongly typed wrapper around {@link EventTarget}.
 *
 * @template T A record mapping event names to their detail types.
 */
export abstract class TypedEventTarget<T extends Record<keyof T, unknown>> {
  readonly #eventTarget = new EventTarget();

  /**
   * Adds an event listener for the given event type.
   *
   * @param type Event type to listen for.
   * @param listener Callback to invoke when the event is dispatched.
   * @param options Event listener options.
   */
  public addEventListener<K extends keyof T>(
    type: K,
    listener: (event: CustomEvent<T[K]>) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.#eventTarget.addEventListener(
      type as string,
      listener as EventListener,
      options,
    );
  }

  /**
   * Removes an event listener for the given event type.
   *
   * @param type Event type to remove listener for.
   * @param listener Callback to remove.
   * @param options Event listener options.
   */
  public removeEventListener<K extends keyof T>(
    type: K,
    listener: (event: CustomEvent<T[K]>) => void,
    options?: boolean | EventListenerOptions,
  ): void {
    this.#eventTarget.removeEventListener(
      type as string,
      listener as EventListener,
      options,
    );
  }

  /**
   * Dispatches a typed event to all registered listeners.
   *
   * @param type Event type to dispatch.
   * @param detail Event detail payload.
   * @returns `true` if the event was not cancelled, `false` otherwise.
   * @protected
   */
  protected dispatchEvent<K extends keyof T>(
    type: K,
    detail: T[K],
  ): boolean {
    return this.#eventTarget.dispatchEvent(
      new CustomEvent(type as string, { detail }),
    );
  }
}
