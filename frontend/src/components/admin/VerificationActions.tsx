// src/components/admin/VerificationActions.tsx
import React, { useState } from 'react';
import { AdminService } from '../../services/adminService';
import { Modal } from '../common/Modal';
import { useToast } from '../../hooks/useToast';
import styles from './VerificationActions.module.css';

interface VerificationActionsProps {
  verificationId: string;
  onActionComplete: () => void;
}

/**
 * Approve/Reject buttons with confirmation modal.
 */
export const VerificationActions: React.FC<VerificationActionsProps> = ({
  verificationId,
  onActionComplete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectReason, setRejectReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleAction = (type: 'approve' | 'reject') => {
    setActionType(type);
    if (type === 'reject') {
      setRejectReason('');
    }
    setIsModalOpen(true);
  };

  const confirmAction = async () => {
    setIsLoading(true);
    try {
      if (actionType === 'approve') {
        await AdminService.approveVerification(verificationId);
        showToast('Verification approved successfully', 'success');
      } else {
        if (!rejectReason.trim()) {
          showToast('Please provide a reason for rejection', 'error');
          setIsLoading(false);
          return;
        }
        await AdminService.rejectVerification(verificationId, rejectReason.trim());
        showToast('Verification rejected', 'info');
      }
      setIsModalOpen(false);
      onActionComplete();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Action failed';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.approve}`}
          onClick={() => handleAction('approve')}
          disabled={isLoading}
        >
          ✅ Approve
        </button>
        <button
          className={`${styles.button} ${styles.reject}`}
          onClick={() => handleAction('reject')}
          disabled={isLoading}
        >
          ❌ Reject
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={actionType === 'approve' ? 'Confirm Approval' : 'Reject Verification'}
      >
        <div className={styles.modalContent}>
          {actionType === 'approve' ? (
            <p>Are you sure you want to approve this verification?</p>
          ) : (
            <>
              <p>Please provide a reason for rejecting this verification:</p>
              <textarea
                className={styles.reasonInput}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={4}
                disabled={isLoading}
              />
            </>
          )}
          <div className={styles.modalActions}>
            <button
              className={styles.cancelButton}
              onClick={() => setIsModalOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className={`${styles.confirmButton} ${
                actionType === 'approve' ? styles.confirmApprove : styles.confirmReject
              }`}
              onClick={confirmAction}
              disabled={isLoading}
            >
              {isLoading
                ? 'Processing...'
                : actionType === 'approve'
                ? 'Yes, Approve'
                : 'Yes, Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};