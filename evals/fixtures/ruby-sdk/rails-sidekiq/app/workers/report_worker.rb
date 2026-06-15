class ReportWorker
  include Sidekiq::Worker

  def perform(report_id)
    report = Report.find(report_id)
    report.generate!
  end
end
