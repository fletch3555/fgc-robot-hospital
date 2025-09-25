import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MachineShopFields from '../../../src/components/requests/MachineShopFields';
import { MachineShopRequestData } from '../../../src/lib/types';

describe('MachineShopFields', () => {
  const mockOnChange = jest.fn();
  const defaultData: MachineShopRequestData = {
    action: '',
    actionOther: '',
    material: '',
    materialOther: '',
    isTeamLabeled: false,
    isDimensionallyMarked: false,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('renders all required fields', () => {
    render(
      <MachineShopFields
        data={{} as MachineShopRequestData}
        onChange={() => {}}
      />
    );
    
    // Check for action needed fieldset
    expect(screen.getByText('Action Needed')).toBeInTheDocument();
    expect(screen.getByLabelText('cut')).toBeInTheDocument();
    expect(screen.getByLabelText('drill')).toBeInTheDocument();
    expect(screen.getByLabelText('tools needed')).toBeInTheDocument();
    expect(screen.getByLabelText('other action')).toBeInTheDocument();
    
    // Check for material type fieldset
    expect(screen.getByText('Material Type')).toBeInTheDocument();
    expect(screen.getByLabelText('extrusion')).toBeInTheDocument();
    expect(screen.getByLabelText('shaft')).toBeInTheDocument();
    expect(screen.getByLabelText('corrogated plastic')).toBeInTheDocument();
    expect(screen.getByLabelText('other material')).toBeInTheDocument();
    
    // Check for material preparation section
    expect(screen.getByText('Material Preparation *')).toBeInTheDocument();
    
    // Check checkboxes (labels don't include asterisk)
    expect(screen.getByLabelText('Material is labeled with team name')).toBeInTheDocument();
    expect(screen.getByLabelText('Material is marked with dimensions')).toBeInTheDocument();
  });

  it('displays validation errors for action field', () => {
    const errors = { action: 'Please select an action needed' };
    render(<MachineShopFields data={defaultData} onChange={mockOnChange} errors={errors} />);
    
    expect(screen.getByText('Please select an action needed')).toBeInTheDocument();
  });

  it('displays validation errors for material field', () => {
    const errors = { material: 'Please select a material type' };
    render(<MachineShopFields data={defaultData} onChange={mockOnChange} errors={errors} />);
    
    expect(screen.getByText('Please select a material type')).toBeInTheDocument();
  });

  it('shows other action text field when other is selected', async () => {
    const dataWithOtherAction = { ...defaultData, action: 'other' };
    
    render(<MachineShopFields data={dataWithOtherAction} onChange={mockOnChange} />);
    
    expect(screen.getByDisplayValue('')).toBeInTheDocument();
    expect(screen.getByText('Maximum 100 characters')).toBeInTheDocument();
  });

  it('shows other material text field when other material is selected', async () => {
    const dataWithOtherMaterial = { ...defaultData, material: 'other' };
    
    render(<MachineShopFields data={dataWithOtherMaterial} onChange={mockOnChange} />);
    
    expect(screen.getByPlaceholderText('Please specify the other material type...')).toBeInTheDocument();
    expect(screen.getByText('Maximum 50 characters')).toBeInTheDocument();
  });

  it('displays validation error for other action field', () => {
    const dataWithOtherAction = { ...defaultData, action: 'other' };
    const errors = { actionOther: 'Please specify the other action needed' };
    
    render(<MachineShopFields data={dataWithOtherAction} onChange={mockOnChange} errors={errors} />);
    
    expect(screen.getByText('Please specify the other action needed')).toBeInTheDocument();
  });

  it('displays validation error for other material field', () => {
    const dataWithOtherMaterial = { ...defaultData, material: 'other' };
    const errors = { materialOther: 'Please specify the other material type' };
    
    render(<MachineShopFields data={dataWithOtherMaterial} onChange={mockOnChange} errors={errors} />);
    
    expect(screen.getByText('Please specify the other material type')).toBeInTheDocument();
  });

  it('displays validation errors for team label checkbox', () => {
    const errors = { isTeamLabeled: 'Material must be labeled with team name for safety' };
    
    render(<MachineShopFields data={defaultData} onChange={mockOnChange} errors={errors} />);
    
    expect(screen.getByText('Material must be labeled with team name for safety')).toBeInTheDocument();
  });

  it('displays validation errors for dimensional marking checkbox', () => {
    const errors = { isDimensionallyMarked: 'Material must be dimensionally marked for safety' };
    
    render(<MachineShopFields data={defaultData} onChange={mockOnChange} errors={errors} />);
    
    expect(screen.getByText('Material must be dimensionally marked for safety')).toBeInTheDocument();
  });

  it('enforces character limits on text fields', () => {
    const dataWithOtherAction = { ...defaultData, action: 'other' };
    render(<MachineShopFields data={dataWithOtherAction} onChange={mockOnChange} />);
    
    const actionInput = screen.getByDisplayValue('');
    expect(actionInput).toHaveAttribute('maxlength', '100');
    
    // Re-render with other material
    render(<MachineShopFields data={{ ...defaultData, material: 'other' }} onChange={mockOnChange} />);
    
    const materialInput = screen.getByPlaceholderText('Please specify the other material type...');
    expect(materialInput).toHaveAttribute('maxlength', '50');
  });

  it('calls onChange when action is selected', async () => {
    const user = userEvent.setup();
    
    render(<MachineShopFields data={defaultData} onChange={mockOnChange} />);
    
    await user.click(screen.getByLabelText('cut'));
    
    expect(mockOnChange).toHaveBeenCalledWith({ action: 'cut' });
  });

  it('calls onChange when material is selected', async () => {
    const user = userEvent.setup();
    
    render(<MachineShopFields data={defaultData} onChange={mockOnChange} />);
    
    await user.click(screen.getByLabelText('extrusion'));
    
    expect(mockOnChange).toHaveBeenCalledWith({ material: 'extrusion' });
  });

  it('calls onChange when checkbox is toggled', async () => {
    const user = userEvent.setup();
    
    render(<MachineShopFields data={defaultData} onChange={mockOnChange} />);
    
    await user.click(screen.getByLabelText('Material is labeled with team name'));
    
    expect(mockOnChange).toHaveBeenCalledWith({ isTeamLabeled: true });
  });

  it('calls onChange when other action text is entered', async () => {
    const user = userEvent.setup();
    const dataWithOtherAction = { ...defaultData, action: 'other' };
    
    render(<MachineShopFields data={dataWithOtherAction} onChange={mockOnChange} />);
    
    const actionInput = screen.getByDisplayValue('');
    await user.type(actionInput, 'Custom action');
    
    expect(mockOnChange).toHaveBeenCalledWith({ actionOther: 'C' });
  });

  it('shows helper text for character limits', () => {
    const dataWithOtherAction = { ...defaultData, action: 'other' };
    render(<MachineShopFields data={dataWithOtherAction} onChange={mockOnChange} />);
    
    expect(screen.getByText('Maximum 100 characters')).toBeInTheDocument();
    
    const dataWithOtherMaterial = { ...defaultData, material: 'other' };
    render(<MachineShopFields data={dataWithOtherMaterial} onChange={mockOnChange} />);
    
    expect(screen.getByText('Maximum 50 characters')).toBeInTheDocument();
  });
});