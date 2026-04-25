package pipeline

import (
	"bytes"
	"context"
	"io"
	"time"
)

type SnapshotFunc func(context.Context) []Report
type SleepFunc func(context.Context, time.Duration) error
type ClearFunc func(*bytes.Buffer)

type Watcher struct {
	Interval time.Duration
	Snapshot SnapshotFunc
	Now      func() time.Time
	Sleep    SleepFunc
	Clear    ClearFunc
}

func NewWatcher(interval time.Duration, snapshot SnapshotFunc) Watcher {
	return Watcher{
		Interval: interval,
		Snapshot: snapshot,
		Now:      time.Now,
		Sleep:    defaultSleep,
		Clear:    defaultClear,
	}
}

func (w Watcher) Run(ctx context.Context, out io.Writer, verbose bool) error {
	if w.Interval <= 0 {
		w.Interval = 15 * time.Second
	}
	if w.Now == nil {
		w.Now = time.Now
	}
	if w.Sleep == nil {
		w.Sleep = defaultSleep
	}
	if w.Clear == nil {
		w.Clear = defaultClear
	}

	for {
		reports := w.Snapshot(ctx)

		var frame bytes.Buffer
		w.Clear(&frame)
		frame.WriteString(RenderReports(reports, verbose, w.Now()))

		if _, err := out.Write(frame.Bytes()); err != nil {
			return err
		}

		if !AnyActive(reports) {
			return nil
		}

		if err := w.Sleep(ctx, w.Interval); err != nil {
			return err
		}
	}
}

func defaultSleep(ctx context.Context, d time.Duration) error {
	timer := time.NewTimer(d)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func defaultClear(buf *bytes.Buffer) {
	buf.WriteString("\033[H\033[2J")
}
