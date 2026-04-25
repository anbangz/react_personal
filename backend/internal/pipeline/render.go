package pipeline

import (
	"bytes"
	"fmt"
	"strings"
	"text/tabwriter"
	"time"
)

func RenderReports(reports []Report, verbose bool, now time.Time) string {
	var buf bytes.Buffer
	tw := tabwriter.NewWriter(&buf, 0, 0, 2, ' ', 0)

	fmt.Fprintln(tw, "PIPELINE\tSTATUS\tSTAGE\tUPDATED\tDETAILS")
	for _, report := range reports {
		fmt.Fprintf(
			tw,
			"%s\t%s\t%s\t%s\t%s\n",
			report.LogicalName,
			report.Status,
			fallback(report.CurrentStage),
			formatRelativeTime(report.UpdatedAt, now),
			fallback(report.Detail),
		)
	}
	_ = tw.Flush()

	if !verbose {
		return buf.String()
	}

	for _, report := range reports {
		fmt.Fprintf(&buf, "\n%s (%s)\n", report.LogicalName, report.PipelineName)
		for _, stage := range report.Stages {
			fmt.Fprintf(
				&buf,
				"  %-16s %-11s %-8s %s\n",
				stage.Name,
				stage.Status,
				formatRelativeTime(stage.UpdatedAt, now),
				fallback(stage.Detail),
			)
		}
	}

	return buf.String()
}

func formatRelativeTime(ts time.Time, now time.Time) string {
	if ts.IsZero() {
		return "-"
	}

	if now.Before(ts) {
		return "0s ago"
	}

	delta := now.Sub(ts)
	switch {
	case delta < time.Minute:
		return fmt.Sprintf("%ds ago", int(delta.Seconds()))
	case delta < time.Hour:
		return fmt.Sprintf("%dm ago", int(delta.Minutes()))
	case delta < 24*time.Hour:
		return fmt.Sprintf("%dh ago", int(delta.Hours()))
	default:
		return fmt.Sprintf("%dd ago", int(delta.Hours()/24))
	}
}

func fallback(value string) string {
	if strings.TrimSpace(value) == "" {
		return "-"
	}

	return value
}
