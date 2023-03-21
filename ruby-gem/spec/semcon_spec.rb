require_relative 'spec_helper'

describe "Semcon handling" do

  # writing data
  Dir.glob(File.expand_path("../input/*.doc", __FILE__)).each do |input|
    it "writes #{input.split('/').last}" do
      expected = File.read(input.sub('input', 'output'))
      data = File.read(input)
      expect(Semcon.write(data, {})).to eq expected
    end
  end

end