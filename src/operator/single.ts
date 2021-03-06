import {Observable} from '../Observable';
import {Operator} from '../Operator';
import {Subscriber} from '../Subscriber';
import {Observer} from '../Observer';
import {EmptyError} from '../util/EmptyError';

/**
 * Returns an Observable that emits the single item emitted by the source Observable that matches a specified
 * predicate, if that Observable emits one such item. If the source Observable emits more than one such item or no
 * such items, notify of an IllegalArgumentException or NoSuchElementException respectively.
 *
 * <img src="./img/single.png" width="100%">
 *
 * @param {Function} a predicate function to evaluate items emitted by the source Observable.
 * @returns {Observable<T>} an Observable that emits the single item emitted by the source Observable that matches
 * the predicate.
 .
 */
export function single<T>(predicate?: (value: T, index: number, source: Observable<T>) => boolean): Observable<T> {
  return this.lift(new SingleOperator(predicate, this));
}

class SingleOperator<T> implements Operator<T, T> {
  constructor(private predicate?: (value: T, index: number, source: Observable<T>) => boolean,
              private source?: Observable<T>) {
  }

  call(subscriber: Subscriber<T>): Subscriber<T> {
    return new SingleSubscriber(subscriber, this.predicate, this.source);
  }
}

class SingleSubscriber<T> extends Subscriber<T> {
  private seenValue: boolean = false;
  private singleValue: T;
  private index: number = 0;

  constructor(destination: Observer<T>,
              private predicate?: (value: T, index: number, source: Observable<T>) => boolean,
              private source?: Observable<T>) {
    super(destination);
  }

  private applySingleValue(value: T): void {
    if (this.seenValue) {
      this.destination.error('Sequence contains more than one element');
    } else {
      this.seenValue = true;
      this.singleValue = value;
    }
  }

  protected _next(value: T): void {
    const predicate = this.predicate;
    this.index++;
    if (predicate) {
      this.tryNext(value);
    } else {
      this.applySingleValue(value);
    }
  }

  private tryNext(value: T): void {
    try {
      const result = this.predicate(value, this.index, this.source);
      if (result) {
        this.applySingleValue(value);
      }
    } catch (err) {
      this.destination.error(err);
    }
  }

  protected _complete(): void {
    const destination = this.destination;

    if (this.index > 0) {
      destination.next(this.seenValue ? this.singleValue : undefined);
      destination.complete();
    } else {
      destination.error(new EmptyError);
    }
  }
}
