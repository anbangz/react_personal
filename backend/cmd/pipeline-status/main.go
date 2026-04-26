package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/anbangz/react_personal/backend/internal/pipeline"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/codepipeline"
)

type selectedPipeline struct {
	LogicalName string
	AWSName     string
}

var knownPipelines = []selectedPipeline{
	{LogicalName: "website", AWSName: "PersonalWebsitePipeline"},
	{LogicalName: "backend", AWSName: "BackendAPIPipeline"},
	{LogicalName: "terraform", AWSName: "TerraformInfrastructurePipeline"},
}

func main() {
	os.Exit(run(context.Background(), os.Stdout, os.Stderr, os.Args[1:]))
}

func run(ctx context.Context, out io.Writer, errOut io.Writer, args []string) int {
	fs := flag.NewFlagSet("pipeline-status", flag.ContinueOnError)
	fs.SetOutput(errOut)

	watch := fs.Bool("watch", false, "watch pipelines until they are no longer active")
	interval := fs.Duration("interval", 15*time.Second, "watch polling interval")
	pipelineName := fs.String("pipeline", "", "logical pipeline name: website, backend, terraform")
	verbose := fs.Bool("verbose", false, "show stage details")

	if err := fs.Parse(args); err != nil {
		return 2
	}

	if *interval <= 0 {
		fmt.Fprintln(errOut, "interval must be greater than 0")
		return 2
	}

	selected, err := resolvePipelineSelection(*pipelineName)
	if err != nil {
		fmt.Fprintln(errOut, err)
		return 2
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		fmt.Fprintf(errOut, "load AWS config: %v\n", err)
		return 1
	}

	reporter := pipeline.NewClient(codepipeline.NewFromConfig(awsCfg))
	snapshot := func(ctx context.Context) []pipeline.Report {
		reports := make([]pipeline.Report, 0, len(selected))
		for _, item := range selected {
			reports = append(reports, reporter.Report(ctx, item.LogicalName, item.AWSName))
		}
		return reports
	}

	if *watch {
		watcher := pipeline.NewWatcher(*interval, snapshot)
		if err := watcher.Run(ctx, out, *verbose); err != nil && !errors.Is(err, context.Canceled) {
			fmt.Fprintf(errOut, "watch pipelines: %v\n", err)
			return 1
		}
		return 0
	}

	if _, err := io.WriteString(out, pipeline.RenderReports(snapshot(ctx), *verbose, time.Now())); err != nil {
		fmt.Fprintf(errOut, "render output: %v\n", err)
		return 1
	}

	return 0
}

func resolvePipelineSelection(name string) ([]selectedPipeline, error) {
	if name == "" {
		return knownPipelines, nil
	}

	for _, item := range knownPipelines {
		if item.LogicalName == name {
			return []selectedPipeline{item}, nil
		}
	}

	return nil, fmt.Errorf("unknown pipeline %q; expected one of: website, backend, terraform", name)
}
